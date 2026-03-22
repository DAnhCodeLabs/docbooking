import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Appointment from "../../models/Appointment.js";
import MedicalRecord from "../../models/MedicalRecord.js";
import Slot from "../../models/Slot.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import { sendAppointmentConfirmation } from "../../utils/email.js";
import logger from "../../utils/logger.js";
import { generateQRCode } from "../../utils/qr.js";

/**
 * Kiểm tra slot có sẵn không
 */
const isSlotAvailable = async (slotId) => {
  const slot = await Slot.findById(slotId).populate("scheduleId");
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Slot không tồn tại.");
  }
  if (slot.status !== "available") {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Slot này đã được đặt hoặc bị khóa.",
    );
  }
  if (slot.leaveId) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Slot này đang bị khóa do bác sĩ nghỉ.",
    );
  }
  // Kiểm tra ngày trong quá khứ
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (slot.scheduleId.date < today) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể đặt lịch cho ngày đã qua.",
    );
  }
  return slot;
};

/**
 * Tạo cuộc hẹn mới
 */
export const createAppointment = async (userId, data) => {
  const { slotId, medicalRecordId, note, symptoms } = data;

  // Lấy medical record và kiểm tra quyền
  const medicalRecord = await MedicalRecord.findOne({
    _id: medicalRecordId,
    user: userId,
  });
  if (!medicalRecord) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền sử dụng hồ sơ này.",
    );
  }

  const slot = await isSlotAvailable(slotId);
  const doctorId = slot.scheduleId.doctor;

  // Tạo QR code (sử dụng appointmentId chưa có, nên tạo tạm UUID)
  const qrData = `${process.env.APP_URL || "http://localhost:3000"}/checkin/${new mongoose.Types.ObjectId()}`;
  const qrCode = await generateQRCode(qrData);

  let appointment;
  try {
    // Tạo appointment
    appointment = await Appointment.create({
      patientProfile: medicalRecordId,
      bookingUser: userId,
      doctor: doctorId,
      slot: slotId,
      qrCode,
      note,
      symptoms,
    });

    // Cập nhật slot
    await Slot.updateOne(
      { _id: slotId },
      { status: "booked", appointmentId: appointment._id },
    );
  } catch (error) {
    // Rollback: xóa appointment nếu đã tạo
    if (appointment && appointment._id) {
      await Appointment.deleteOne({ _id: appointment._id }).catch((e) =>
        logger.error(e),
      );
    }
    logger.error(`Lỗi tạo appointment: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Đặt lịch thất bại. Vui lòng thử lại.",
    );
  }

  // Gửi email thông báo (sau transaction)
  const doctor = await User.findById(doctorId).select("fullName");
  const slotTime = `${slot.startTime} - ${slot.endTime}`;
  const appointmentData = {
    patientName: medicalRecord.fullName,
    doctorName: doctor?.fullName || "Bác sĩ",
    date: slot.scheduleId.date,
    time: slotTime,
    qrCodeUrl: qrCode,
  };
  // Lấy email của người đặt lịch (user hiện tại)
  const user = await User.findById(userId).select("email");
  if (user?.email) {
    await sendAppointmentConfirmation(user.email, appointmentData);
  } else {
    logger.warn(`Không thể gửi email xác nhận: user ${userId} không có email.`);
  }

  return appointment[0];
};

/**
 * Lấy danh sách cuộc hẹn của user
 */
export const getMyAppointments = async (userId, query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { bookingUser: userId };
  if (query.status) filter.status = query.status;

  const appointments = await Appointment.find(filter)
    .populate("patientProfile", "fullName phone cccd")
    .populate("doctor", "fullName")
    .populate("slot")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Appointment.countDocuments(filter);

  return { appointments, total, page, limit };
};

/**
 * Hủy cuộc hẹn
 */
export const cancelAppointment = async (appointmentId, userId, reason) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    bookingUser: userId,
  });
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy cuộc hẹn.");
  }
  if (appointment.status !== "confirmed") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Chỉ có thể hủy cuộc hẹn đang chờ xác nhận.",
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      appointment.status = "cancelled";
      appointment.cancellationReason = reason || "";
      await appointment.save({ session });

      await Slot.updateOne(
        { _id: appointment.slot },
        { status: "available", appointmentId: null },
        { session },
      );
    });
  } catch (error) {
    logger.error(`Lỗi hủy appointment: ${error.message}`);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Hủy lịch thất bại.");
  } finally {
    session.endSession();
  }

  return { message: "Hủy lịch thành công." };
};

/**
 * Check-in (quét QR)
 */
export const checkinAppointment = async (appointmentId, userId) => {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    bookingUser: userId,
  });
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy cuộc hẹn.");
  }
  if (appointment.status !== "confirmed") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cuộc hẹn không thể check-in.");
  }

  // Kiểm tra thời gian check-in: từ 30 phút trước đến 30 phút sau giờ bắt đầu
  const slot = await Slot.findById(appointment.slot).populate("scheduleId");
  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Slot không tồn tại.");
  }

  const slotDate = new Date(slot.scheduleId.date);
  const [hour, minute] = slot.startTime.split(":").map(Number);
  slotDate.setUTCHours(hour, minute, 0, 0);

  const now = new Date();
  const thirtyMinutes = 30 * 60 * 1000;
  if (now < slotDate - thirtyMinutes || now > slotDate + thirtyMinutes) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Chỉ có thể check-in trong khoảng 30 phút trước và sau giờ hẹn.",
    );
  }

  appointment.status = "checked_in";
  appointment.checkinTime = now;
  await appointment.save();

  return {
    message: "Check-in thành công. Vui lòng vào phòng khám theo hướng dẫn.",
  };
};
