import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Appointment from "../../models/Appointment.js";
import AuditLog from "../../models/AuditLog.js";
import ClinicLead from "../../models/ClinicLead.js";
import DoctorProfile from "../../models/DoctorProfile.js";
import MedicalConsultation from "../../models/MedicalConsultation.js";
import MedicalRecord from "../../models/MedicalRecord.js";
import Payment from "../../models/Payment.js";
import RevenueSplit from "../../models/RevenueSplit.js";
import Slot from "../../models/Slot.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import { getTodayUTC, normalizeUTCDate } from "../../utils/date.js";
import {
  sendAppointmentConfirmation,
  sendPrescriptionEmail,
  sendRefundNotification,
} from "../../utils/email.js";
import logger from "../../utils/logger.js";
import { generateQRCode } from "../../utils/qr.js";
import { generatePaymentUrl } from "../../utils/vnpay.js";
import * as clinicLeadService from "../clinicLead/clinicLead.service.js";
import * as doctorService from "../doctor/doctor.service.js";
import { processRefund } from "../payment/payment.service.js";

dayjs.extend(utc);

const atomicUpdateSlot = async (
  slotId,
  currentStatus,
  newStatus,
  additionalUpdate = {},
) => {
  const update = { $set: { status: newStatus, ...additionalUpdate } };
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, status: currentStatus },
    update,
    { returnDocument: "after" }, // sửa từ { new: true } thành returnDocument
  );
  return slot;
};

export const createAppointment = async (
  userId,
  data,
  origin,
  clientIp = "127.0.0.1",
) => {
  const { slotId, medicalRecordId, note, symptoms, paymentMethod } = data;

  // 1. Kiểm tra medical record
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

  // 2. Atomic lock slot (tạm giữ)
  let slot = await atomicUpdateSlot(slotId, "available", "pending_payment", {
    appointmentId: null,
  });
  if (!slot) {
    const existingSlot = await Slot.findById(slotId);
    if (!existingSlot)
      throw new ApiError(StatusCodes.NOT_FOUND, "Slot không tồn tại.");
    if (existingSlot.status !== "available")
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Slot này đã được đặt hoặc bị khóa.",
      );
    if (existingSlot.leaveId)
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Slot này đang bị khóa do bác sĩ nghỉ.",
      );
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không thể đặt slot, vui lòng thử lại.",
    );
  }

  const fullSlot = await Slot.findById(slot._id).populate("scheduleId");
  if (!fullSlot) {
    // Rollback
    await atomicUpdateSlot(slotId, "pending_payment", "available", {
      appointmentId: null,
    });
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Slot không hợp lệ.");
  }

  const doctorId = fullSlot.scheduleId.doctor;

  // 3. Kiểm tra ngày không quá khứ
  const slotDate = normalizeUTCDate(fullSlot.scheduleId.date);
  const today = getTodayUTC();
  if (slotDate < today) {
    await atomicUpdateSlot(slotId, "pending_payment", "available", {
      appointmentId: null,
    });
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể đặt lịch cho ngày đã qua.",
    );
  }

  // 4. Tạo appointment và payment
  let appointment;
  let paymentRecord;
  let paymentUrl;

  try {
    // Tạo appointment (chưa có QR)
    appointment = await Appointment.create({
      patientProfile: userId,
      bookingUser: userId,
      doctor: doctorId,
      slot: slotId,
      note,
      symptoms,
      qrCode: "pending", // sẽ tạo sau khi thanh toán thành công
      paymentMethod,
      paymentStatus: "pending",
      paymentExpiryAt:
        paymentMethod === "online"
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null,
      status: paymentMethod === "online" ? "pending_payment" : "confirmed",
    });

    // Cập nhật slot với appointmentId
    const updatedSlot = await atomicUpdateSlot(
      slotId,
      "pending_payment",
      "pending_payment",
      {
        appointmentId: appointment._id,
      },
    );
    if (!updatedSlot) {
      // race condition: slot đã bị thay đổi
      await Appointment.findByIdAndDelete(appointment._id);
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Slot đã bị thay đổi, vui lòng thử lại.",
      );
    }

    if (paymentMethod === "online") {
      // Tạo payment record
      const DoctorProfile = await import("../../models/DoctorProfile.js").then(
        (m) => m.default,
      );
      const doctorProfile = await DoctorProfile.findOne({
        user: doctorId,
      }).select("consultationFee");
      const fee = doctorProfile?.consultationFee || 100000; // fallback nếu không có
      paymentRecord = await Payment.create({
        appointmentId: appointment._id,
        orderId: appointment._id.toString(),
        amount: fee,
        status: "pending",
      });

      // Tạo URL thanh toán
      const returnUrl =
        process.env.VNP_RETURN_URL || `${origin}/payment-result`;
      const ipnUrl =
        process.env.VNP_IPN_URL ||
        `${process.env.BACKEND_URL}/api/payments/vnpay-ipn`;
      paymentUrl = generatePaymentUrl(
        appointment._id.toString(),
        paymentRecord.amount,
        returnUrl,
        ipnUrl,
        clientIp,
      );
    } else {
      // Offline: tạo QR và gửi email ngay
      const baseUrl = origin || "http://localhost:3000";
      const qrData = `${baseUrl}/checkin/${appointment._id}`;
      const qrCode = await generateQRCode(qrData);
      appointment.qrCode = qrCode;
      await appointment.save();

      // Gửi email
      const doctor = await User.findById(doctorId).select("fullName");
      const slotTime = `${fullSlot.startTime} - ${fullSlot.endTime}`;
      const appointmentData = {
        patientName: medicalRecord.fullName,
        doctorName: doctor?.fullName || "Bác sĩ",
        date: fullSlot.scheduleId.date,
        time: slotTime,
        qrCodeUrl: qrCode,
      };
      const user = await User.findById(userId).select("email");
      if (user?.email) {
        await sendAppointmentConfirmation(user.email, appointmentData);
      }
    }
  } catch (error) {
    // Rollback: xóa appointment, giải phóng slot, xóa payment
    if (appointment) await Appointment.findByIdAndDelete(appointment._id);
    if (paymentRecord) await Payment.findByIdAndDelete(paymentRecord._id);
    await atomicUpdateSlot(slotId, "pending_payment", "available", {
      appointmentId: null,
    });
    logger.error(`Lỗi tạo appointment: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Đặt lịch thất bại. Vui lòng thử lại.",
    );
  }

  if (paymentMethod === "online") {
    return { paymentUrl, appointmentId: appointment._id };
  }
  return appointment;
};

/**
 * Lấy danh sách cuộc hẹn của user
 */
export const getMyAppointments = async (userId, query) => {
  // ========== FIX: Đảm bảo dateFrom/dateTo là Date object ==========
  if (query.dateFrom && typeof query.dateFrom === "string") {
    query.dateFrom = dayjs.utc(query.dateFrom).startOf("day").toDate();
  }
  if (query.dateTo && typeof query.dateTo === "string") {
    query.dateTo = dayjs.utc(query.dateTo).endOf("day").toDate();
  }
  // ================================================================

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  // 1. Match bookingUser
  const matchStage = { bookingUser: new mongoose.Types.ObjectId(userId) };
  if (query.status) {
    const statusArray = query.status.split(",").map((s) => s.trim());
    if (statusArray.length === 1) {
      matchStage.status = statusArray[0];
    } else {
      matchStage.status = { $in: statusArray };
    }
  }
  pipeline.push({ $match: matchStage });

  // 2. Lookup slot
  pipeline.push({
    $lookup: {
      from: "slots",
      localField: "slot",
      foreignField: "_id",
      as: "slotInfo",
    },
  });
  pipeline.push({
    $unwind: { path: "$slotInfo", preserveNullAndEmptyArrays: true },
  });

  // 3. Lookup schedule
  pipeline.push({
    $lookup: {
      from: "schedules",
      localField: "slotInfo.scheduleId",
      foreignField: "_id",
      as: "scheduleInfo",
    },
  });
  pipeline.push({
    $unwind: { path: "$scheduleInfo", preserveNullAndEmptyArrays: true },
  });

  // 4. Lọc theo ngày (nếu có)
  if (query.dateFrom || query.dateTo) {
    const dateFilter = {};
    if (query.dateFrom) dateFilter.$gte = query.dateFrom;
    if (query.dateTo) dateFilter.$lte = query.dateTo;

    pipeline.push({
      $match: {
        $or: [
          { "scheduleInfo.date": dateFilter },
          { "scheduleInfo.date": { $exists: false } }, // Giữ record không có schedule (phòng dữ liệu lỗi)
        ],
      },
    });
  }

  // 5. Lookup doctor
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "doctor",
      foreignField: "_id",
      as: "doctorInfo",
    },
  });
  pipeline.push({
    $unwind: { path: "$doctorInfo", preserveNullAndEmptyArrays: true },
  });

  // 6. Lookup patient profile (User)
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "patientProfile",
      foreignField: "_id",
      as: "patientInfo",
    },
  });
  pipeline.push({
    $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true },
  });

  // 7. Sort
  pipeline.push({ $sort: { createdAt: -1 } });

  // 8. Facet phân trang
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  const results = await Appointment.aggregate(pipeline);
  const total = results[0]?.metadata[0]?.total || 0;
  let appointments = results[0]?.data || [];

  // 9. Gán specialty và clinicName (giữ nguyên logic cũ)
  if (appointments.length > 0) {
    const doctorIds = [
      ...new Set(
        appointments.map((app) => app.doctorInfo?._id).filter(Boolean),
      ),
    ];
    if (doctorIds.length > 0) {
      const DoctorProfile = await import("../../models/DoctorProfile.js").then(
        (m) => m.default,
      );
      const doctorProfiles = await DoctorProfile.find({
        user: { $in: doctorIds },
      })
        .populate("specialty", "name")
        .populate("clinicId", "clinicName")
        .lean();
      const mapDoctorProfile = new Map(
        doctorProfiles.map((dp) => [dp.user.toString(), dp]),
      );

      appointments = appointments.map((app) => {
        const doctor = app.doctorInfo;
        if (doctor) {
          const dp = mapDoctorProfile.get(doctor._id.toString());
          if (dp) {
            doctor.specialty = dp.specialty || null;
            if (dp.clinicId) doctor.clinicName = dp.clinicId.clinicName;
            else if (dp.customClinicName)
              doctor.clinicName = dp.customClinicName;
            else doctor.clinicName = null;
          } else {
            doctor.specialty = null;
            doctor.clinicName = null;
          }
        }
        return app;
      });
    }
  }

  // 10. Định dạng lại
  const formattedAppointments = appointments.map((app) => ({
    ...app,
    slot: app.slotInfo,
    doctor: app.doctorInfo,
    patientId: app.patientInfo,
  }));

  return {
    appointments: formattedAppointments,
    total,
    page,
    limit,
  };
};
/**
 * Hủy cuộc hẹn
 */
export const cancelAppointment = async (
  appointmentId,
  userId,
  reason,
  ipAddress,
  userAgent,
) => {
  // 1. Tìm appointment và slot, populate
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    $or: [{ bookingUser: userId }, { doctor: userId }],
  })
    .populate({
      path: "slot",
      populate: {
        path: "scheduleId",
        model: "Schedule",
      },
    })
    .populate("doctor");

  if (!appointment) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy cuộc hẹn hoặc bạn không có quyền hủy.",
    );
  }

  // 2. Kiểm tra trạng thái (chỉ cho phép hủy khi đang confirmed)
  if (appointment.status !== "confirmed") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cuộc hẹn đang ở trạng thái ${appointment.status}, không thể hủy.`,
    );
  }

  // 3. Kiểm tra thời gian slot
  const slot = appointment.slot;
  const slotStart = new Date(slot.scheduleId.date);
  const [hour, minute] = slot.startTime.split(":").map(Number);
  slotStart.setUTCHours(hour, minute, 0, 0);
  const now = new Date();
  if (now >= slotStart) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể hủy lịch đã qua giờ khám.",
    );
  }

  // 4. Xử lý refund và tính toán platform giữ lại (chỉ với online)
  let refundAmount = 0;
  let platformKept = 0;
  let clinicId = null;

  if (
    appointment.paymentMethod === "online" &&
    appointment.paymentStatus === "paid"
  ) {
    const payment = await Payment.findOne({ appointmentId: appointment._id });
    if (!payment) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Không tìm thấy thông tin thanh toán.",
      );
    }

    const paidAmount = payment.amount;
    const diffMs = slotStart - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 2) {
      // Hủy trước 2h: hoàn 100%
      refundAmount = paidAmount;
      platformKept = 0;
    } else if (diffHours > 0 && diffHours < 2) {
      // Hủy sau 2h (trước giờ khám): hoàn 40%, platform giữ 60%
      refundAmount = paidAmount * 0.4;
      platformKept = paidAmount * 0.6;
    } else {
      // Hủy sát giờ hoặc sau giờ (diffHours <= 0): không hoàn, platform giữ 100%
      refundAmount = 0;
      platformKept = paidAmount;
    }
    if (refundAmount > 0) {
      try {
        await processRefund(
          payment._id,
          refundAmount,
          reason || "Khách hàng hủy lịch",
        );
      } catch (refundError) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          refundError.message || "Không thể hoàn tiền, vui lòng thử lại sau.",
        );
      }
    } else if (refundAmount === 0) {
      // ✅ Nếu không hoàn tiền, chỉ update refundStatus
      payment.refundStatus = "none";
      payment.refundAmount = 0;
      await payment.save();
    }

    // Lấy clinicId từ doctorProfile để tạo revenue split nếu platform giữ tiền
    if (platformKept > 0) {
      const doctorProfile = await DoctorProfile.findOne({
        user: appointment.doctor,
      });
      if (doctorProfile) {
        if (doctorProfile.clinicId) {
          clinicId = doctorProfile.clinicId;
        } else if (doctorProfile.customClinicName) {
          const clinic = await ClinicLead.findOne({
            clinicName: doctorProfile.customClinicName,
            status: "resolved",
          });
          if (clinic) clinicId = clinic._id;
        }
      }
    }
  }

  // 5. Cập nhật slot (atomic)
  const slotUpdateResult = await Slot.updateOne(
    {
      _id: slot._id,
      status: "booked",
      appointmentId: appointment._id,
    },
    { status: "available", appointmentId: null },
  );
  if (slotUpdateResult.modifiedCount === 0) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Slot đã bị thay đổi, vui lòng thử lại.",
    );
  }

  // 6. Cập nhật appointment
  appointment.status = "cancelled";
  appointment.cancellationReason = reason || "";
  appointment.refundAmount = refundAmount;
  await appointment.save();

  // 7. Tạo revenue split nếu platform giữ tiền (online)
  if (platformKept > 0 && clinicId) {
    try {
      await RevenueSplit.create({
        appointmentId: appointment._id,
        clinicId,
        platformAmount: platformKept,
        clinicAmount: 0,
        method: "online",
        status: "cancelled_refund",
        note: `Hủy lịch, giữ ${platformKept} cho platform`,
        calculatedAt: new Date(),
      });
    } catch (splitError) {
      logger.error(
        `Lỗi tạo revenue split khi hủy appointment ${appointment._id}: ${splitError.message}`,
      );
      // Không throw lỗi để không ảnh hưởng đến việc hủy lịch
    }
  }

  // 8. Audit log
  await AuditLog.create({
    userId,
    action: "CANCEL_APPOINTMENT",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      appointmentId: appointment._id,
      reason,
      refundAmount,
      platformKept,
      cancelledBy: userId,
      role:
        appointment.bookingUser.toString() === userId.toString()
          ? "patient"
          : "doctor",
    },
  });

  // 9. Ghi log riêng cho refund nếu có
  if (refundAmount > 0) {
    await AuditLog.create({
      userId,
      action: "REFUND_PROCESSED",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: {
        appointmentId: appointment._id,
        refundAmount,
        paymentId: (await Payment.findOne({ appointmentId: appointment._id }))
          ?._id,
      },
    });
  }

  // 10. Gửi email thông báo
  const user = await User.findById(userId).select("email fullName");
  if (user?.email) {
    await sendRefundNotification(user.email, {
      patientName: appointment.patientProfile.fullName,
      doctorName: appointment.doctor.fullName,
      date: slot.scheduleId.date,
      time: `${slot.startTime} - ${slot.endTime}`,
      refundAmount,
      reason: reason || "Không có lý do",
    });
  }

  return {
    message: `Hủy lịch thành công${refundAmount > 0 ? `, số tiền hoàn lại: ${refundAmount.toLocaleString()}đ` : ""}${platformKept > 0 ? `, nền tảng giữ: ${platformKept.toLocaleString()}đ` : ""}.`,
  };
};
/**
 * Check-in (quét QR)
 */
export const checkinAppointment = async (appointmentId, user) => {
  const appointment = await Appointment.findById(appointmentId)
    .populate("patientProfile", "fullName phone")
    .populate("doctor", "fullName")
    .populate({
      path: "slot",
      populate: { path: "scheduleId", select: "date" },
    });

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy cuộc hẹn.");
  }

  // Chỉ cho phép clinic_admin
  if (user.role !== "clinic_admin") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ nhân viên bệnh viện mới được phép check‑in.",
    );
  }

  // Kiểm tra bác sĩ thuộc phòng khám của clinic_admin
  const ClinicLead = await import("../../models/ClinicLead.js").then(
    (m) => m.default,
  );
  const clinic = await ClinicLead.findOne({
    user: user._id,
    status: "resolved",
  });
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào.",
    );
  }

  const DoctorProfile = await import("../../models/DoctorProfile.js").then(
    (m) => m.default,
  );
  const doctorProfile = await DoctorProfile.findOne({
    user: appointment.doctor._id,
  }).populate("clinicId", "clinicName");
  if (!doctorProfile) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không tìm thấy thông tin bác sĩ.",
    );
  }

  const isOwnDoctor =
    (doctorProfile.clinicId &&
      doctorProfile.clinicId._id.toString() === clinic._id.toString()) ||
    (doctorProfile.customClinicName &&
      doctorProfile.customClinicName.trim().toLowerCase() ===
        clinic.clinicName.trim().toLowerCase());

  if (!isOwnDoctor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền check‑in cho bác sĩ không thuộc phòng khám của mình.",
    );
  }

  // Kiểm tra trạng thái và thời gian check‑in (giữ nguyên phần còn lại)
  if (appointment.status !== "confirmed") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cuộc hẹn đang ở trạng thái ${appointment.status}, không thể check‑in.`,
    );
  }

  const slot = appointment.slot;
  const slotDate = new Date(slot.scheduleId.date);
  const [hour, minute] = slot.startTime.split(":").map(Number);
  slotDate.setUTCHours(hour, minute, 0, 0);

  const now = new Date();
  const checkinWindowMinutes = 30;
  const checkinWindow = checkinWindowMinutes * 60 * 1000;

  // if (now < slotDate - checkinWindow || now > slotDate + checkinWindow) {
  //   throw new ApiError(
  //     StatusCodes.BAD_REQUEST,
  //     `Chỉ có thể check‑in trong khoảng ${checkinWindowMinutes} phút trước và sau giờ hẹn.`,
  //   );
  // }

  appointment.status = "checked_in";
  appointment.checkinTime = now;
  appointment.paymentStatus = "paid";
  await appointment.save();
  console.log("[Checkin] Data before return:", {
    patientName: appointment.patientProfile?.fullName,
    doctorName: appointment.doctor?.fullName,
    date: slot.scheduleId?.date,
    time: `${slot.startTime} - ${slot.endTime}`,
    clinicName: "Phòng khám DocGo",
    status: appointment.status,
  });
  let clinicName = "Phòng khám DocGo"; // fallback
  if (doctorProfile) {
    if (doctorProfile.clinicId) {
      clinicName = doctorProfile.clinicId.clinicName;
    } else if (doctorProfile.customClinicName) {
      clinicName = doctorProfile.customClinicName;
    }
  }
  return {
    message: "Check‑in thành công. Vui lòng vào phòng khám theo hướng dẫn.",
    data: {
      patientName: appointment.patientProfile.fullName,
      doctorName: appointment.doctor.fullName,
      date: slot.scheduleId.date,
      time: `${slot.startTime} - ${slot.endTime}`,
      clinicName,
      status: appointment.status,
    },
  };
};

export const getAppointments = async (user, query) => {
  if (query.dateFrom && typeof query.dateFrom === "string") {
    query.dateFrom = dayjs.utc(query.dateFrom).startOf("day").toDate();
  }
  if (query.dateTo && typeof query.dateTo === "string") {
    query.dateTo = dayjs.utc(query.dateTo).endOf("day").toDate();
  }
  const { role, _id: userId } = user;
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const pipeline = [];

  // Xác định điều kiện lọc theo role
  let doctorIdsFilter = null;
  if (role === "admin") {
    if (query.doctorId) {
      doctorIdsFilter = [new mongoose.Types.ObjectId(query.doctorId)];
    }
  } else if (role === "doctor") {
    doctorIdsFilter = [new mongoose.Types.ObjectId(userId)];
  } else if (role === "clinic_admin") {
    const clinic = await clinicLeadService.getClinicByUserId(userId);
    if (!clinic) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Không tìm thấy phòng khám liên kết.",
      );
    }
    const doctorIds = await doctorService.getDoctorIdsByClinic(
      clinic._id,
      clinic.clinicName,
    );
    if (doctorIds.length === 0) {
      return { appointments: [], total: 0, page, limit };
    }
    doctorIdsFilter = doctorIds.map((id) => new mongoose.Types.ObjectId(id));
  } else if (role === "patient") {
    pipeline.push({
      $match: { bookingUser: new mongoose.Types.ObjectId(userId) },
    });
  } else {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không có quyền truy cập.");
  }

  if (doctorIdsFilter) {
    pipeline.push({ $match: { doctor: { $in: doctorIdsFilter } } });
  }
  if (query.status) {
    const statusArray = query.status.split(",").map((s) => s.trim());
    if (statusArray.length === 1) {
      pipeline.push({ $match: { status: statusArray[0] } });
    } else {
      pipeline.push({ $match: { status: { $in: statusArray } } });
    }
  }

  // Lookup slot & schedule
  pipeline.push(
    {
      $lookup: {
        from: "slots",
        localField: "slot",
        foreignField: "_id",
        as: "slotInfo",
      },
    },
    { $unwind: { path: "$slotInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "schedules",
        localField: "slotInfo.scheduleId",
        foreignField: "_id",
        as: "scheduleInfo",
      },
    },
    { $unwind: { path: "$scheduleInfo", preserveNullAndEmptyArrays: true } },
  );

  // Lọc theo ngày
  if (query.dateFrom || query.dateTo) {
    const dateFilter = {};
    if (query.dateFrom) dateFilter.$gte = query.dateFrom;
    if (query.dateTo) dateFilter.$lte = query.dateTo;
    pipeline.push({
      $match: {
        $or: [
          { "scheduleInfo.date": dateFilter },
          { "scheduleInfo.date": { $exists: false } },
        ],
      },
    });
  }

  // Lookup patient và doctor
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "patientProfile",
        foreignField: "_id",
        as: "patientInfo",
      },
    },
    { $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "doctor",
        foreignField: "_id",
        as: "doctorInfo",
      },
    },
    { $unwind: { path: "$doctorInfo", preserveNullAndEmptyArrays: true } },
  );

  // Search
  if (query.search) {
    const searchRegex = { $regex: query.search, $options: "i" };
    pipeline.push({
      $match: {
        $or: [
          { "patientInfo.fullName": searchRegex },
          { "patientInfo.phone": searchRegex },
          { "patientInfo.cccd": searchRegex },
          { "doctorInfo.fullName": searchRegex },
        ],
      },
    });
  }

  // Sort
  const sortField = query.sort?.startsWith("-")
    ? query.sort.slice(1)
    : query.sort || "createdAt";
  const sortOrder = query.sort?.startsWith("-") ? -1 : 1;
  pipeline.push({ $sort: { [sortField]: sortOrder } });

  // Phân trang
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  const results = await Appointment.aggregate(pipeline);
  const total = results[0]?.metadata[0]?.total || 0;
  let appointments = results[0]?.data || [];

  // Gán specialty, clinicName (giống getMyAppointments)
  if (appointments.length > 0) {
    const doctorIds = [
      ...new Set(
        appointments.map((app) => app.doctorInfo?._id).filter(Boolean),
      ),
    ];
    if (doctorIds.length > 0) {
      const DoctorProfile = await import("../../models/DoctorProfile.js").then(
        (m) => m.default,
      );
      const doctorProfiles = await DoctorProfile.find({
        user: { $in: doctorIds },
      })
        .populate("specialty", "name")
        .populate("clinicId", "clinicName")
        .lean();
      const mapDoctorProfile = new Map(
        doctorProfiles.map((dp) => [dp.user.toString(), dp]),
      );

      appointments = appointments.map((app) => {
        const doctor = app.doctorInfo;
        if (doctor) {
          const dp = mapDoctorProfile.get(doctor._id.toString());
          if (dp) {
            doctor.specialty = dp.specialty || null;
            if (dp.clinicId) doctor.clinicName = dp.clinicId.clinicName;
            else if (dp.customClinicName)
              doctor.clinicName = dp.customClinicName;
            else doctor.clinicName = null;
          } else {
            doctor.specialty = null;
            doctor.clinicName = null;
          }
        }
        return app;
      });
    }
  }

  const formattedAppointments = appointments.map((app) => ({
    ...app,
    slot: app.slotInfo,
    doctor: app.doctorInfo,
    patientId: app.patientInfo,
  }));

  return {
    appointments: formattedAppointments,
    total,
    page,
    limit,
  };
};

/**
 * Lấy chi tiết một lịch hẹn (có kiểm tra quyền)
 */
export const getAppointmentById = async (user, appointmentId) => {
  const { role, _id: userId } = user;

  const appointment = await Appointment.findById(appointmentId)
    .populate("patientProfile", "fullName email phone")
    .populate("doctor", "fullName email")
    .populate("bookingUser", "fullName email")
    .populate({
      path: "slot",
      populate: { path: "scheduleId", select: "date" },
    });

  // Chuyển thành plain object để dễ dàng thêm field
  let result = appointment.toObject();

  if (result.doctor) {
    const DoctorProfile = await import("../../models/DoctorProfile.js").then(
      (m) => m.default,
    );
    const doctorProfile = await DoctorProfile.findOne({
      user: result.doctor._id,
    })
      .populate("specialty", "name")
      .populate("clinicId", "clinicName"); // quan trọng: lấy thông tin clinic

    // Gán specialty
    result.doctor.specialty = doctorProfile?.specialty || null;

    // Gán clinicName
    if (doctorProfile) {
      if (doctorProfile.clinicId) {
        result.doctor.clinicName = doctorProfile.clinicId.clinicName;
      } else if (doctorProfile.customClinicName) {
        result.doctor.clinicName = doctorProfile.customClinicName;
      } else {
        result.doctor.clinicName = null;
      }
    } else {
      result.doctor.clinicName = null;
    }
  }

  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy lịch hẹn.");
  }

  // Kiểm tra quyền
  if (role === "admin") {
    // Admin được xem tất cả
  } else if (role === "doctor") {
    // Bác sĩ chỉ xem lịch hẹn của chính mình
    if (appointment.doctor._id.toString() !== userId.toString()) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền xem lịch hẹn này.",
      );
    }
  } else if (role === "clinic_admin") {
    const clinic = await clinicLeadService.getClinicByUserId(userId);
    if (!clinic) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Tài khoản không liên kết với phòng khám.",
      );
    }
    const doctorIds = await doctorService.getDoctorIdsByClinic(
      clinic._id,
      clinic.clinicName,
    );
    // Log để debug
    console.log("[getAppointmentById] doctorIds:", doctorIds);
    console.log(
      "[getAppointmentById] appointment.doctor._id:",
      appointment.doctor._id.toString(),
    );

    if (!doctorIds.includes(appointment.doctor._id.toString())) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền xem lịch hẹn này.",
      );
    }
  } else if (role === "patient") {
    if (appointment.bookingUser._id.toString() !== userId.toString()) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền xem lịch hẹn của người khác.",
      );
    }
  } else {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không có quyền truy cập.");
  }

  // Normalize response format to match list endpoints for consistency
  // Rename patientProfile to patientId for consistent field naming
  const normalizedResult = {
    ...result,
    patientId: result.patientProfile,
  };
  delete normalizedResult.patientProfile;

  return normalizedResult;
};

export const completeAppointment = async (
  appointmentId,
  doctorId,
  data,
  ipAddress,
  userAgent,
) => {
  const { diagnosis, prescription, instructions, followUpDate } = data;

  // 1. Kiểm tra appointment
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
    status: "checked_in",
  }).populate("patientProfile");

  if (!appointment) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy lịch hẹn đang chờ khám hoặc bạn không có quyền.",
    );
  }

  // 2. Kiểm tra trùng consultation
  const existing = await MedicalConsultation.findOne({ appointmentId });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Lịch hẹn này đã được ghi nhận kết quả khám trước đó.",
    );
  }

  let consultation = null;

  try {
    // 3. Tạo consultation và cập nhật appointment (KHÔNG DÙNG TRANSACTION với split)
    consultation = await MedicalConsultation.create({
      appointmentId,
      doctorId,
      patientId: appointment.patientProfile._id,
      diagnosis,
      prescription,
      instructions,
      followUpDate,
    });

    // 4. Cập nhật appointment
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, doctor: doctorId, status: "checked_in" },
      { status: "completed", completedAt: new Date() },
      { returnDocument: "after" },
    );

    if (!updatedAppointment) {
      // Rollback consultation
      await MedicalConsultation.findByIdAndDelete(consultation._id);
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Lịch hẹn đã thay đổi trạng thái, không thể hoàn thành.",
      );
    }

    // 5. Gửi email đơn thuốc (không await để không chậm)
    sendPrescriptionEmail(appointmentId, consultation._id).catch((err) => {
      logger.error(`Lỗi gửi email đơn thuốc: ${err.message}`);
    });

    // 6. Audit log
    await AuditLog.create({
      userId: doctorId,
      action: "COMPLETE_APPOINTMENT",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: {
        appointmentId,
        diagnosis,
        prescriptionCount: prescription?.length || 0,
      },
    });

    // 7. Tạo revenue split (sau khi đã hoàn thành ca khám, không ảnh hưởng nếu lỗi)
    try {
      // Lấy thông tin clinic từ doctorProfile
      const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
      let clinicId = null;
      if (doctorProfile) {
        if (doctorProfile.clinicId) {
          clinicId = doctorProfile.clinicId;
        } else if (doctorProfile.customClinicName) {
          const clinic = await ClinicLead.findOne({
            clinicName: doctorProfile.customClinicName,
            status: "resolved",
          });
          if (clinic) clinicId = clinic._id;
        }
      }
      if (clinicId) {
        // Kiểm tra xem đã có split chưa
        const existingSplit = await RevenueSplit.findOne({ appointmentId });
        if (!existingSplit) {
          let platformAmount = 0,
            clinicAmount = 0;
          const paymentMethod = appointment.paymentMethod;

          if (paymentMethod === "online") {
            const payment = await Payment.findOne({
              appointmentId,
              status: "paid",
            });
            if (payment) {
              const totalAmount = payment.amount;
              platformAmount = totalAmount * 0.6;
              clinicAmount = totalAmount * 0.4;
            }
          } else if (paymentMethod === "offline") {
            const fee = doctorProfile.consultationFee || 0;
            platformAmount = fee * 0.6;
            clinicAmount = fee * 0.4;
          }

          if (platformAmount > 0 || clinicAmount > 0) {
            await RevenueSplit.create({
              appointmentId,
              clinicId,
              platformAmount,
              clinicAmount,
              method: paymentMethod,
              status: "completed",
              calculatedAt: new Date(),
            });
            logger.info(
              `Đã tạo revenue split cho appointment ${appointmentId}: platform=${platformAmount}, clinic=${clinicAmount}`,
            );
          }
        }
      } else {
        logger.warn(
          `Không tìm thấy clinicId cho bác sĩ ${doctorId}, bỏ qua tạo revenue split.`,
        );
      }
    } catch (splitError) {
      // Chỉ log lỗi, không ảnh hưởng đến kết quả hoàn thành ca khám
      logger.error(
        `Lỗi tạo revenue split cho appointment ${appointmentId}: ${splitError.message}`,
      );
    }

    logger.info(
      `Bác sĩ ${doctorId} đã hoàn thành appointment ${appointmentId}`,
    );
    return {
      message: "Kết thúc khám thành công.",
      consultation,
    };
  } catch (error) {
    // Nếu lỗi xảy ra và consultation đã được tạo, rollback
    if (consultation) {
      await MedicalConsultation.findByIdAndDelete(consultation._id).catch((e) =>
        logger.error(`Rollback consultation thất bại: ${e.message}`),
      );
    }
    logger.error(`Lỗi hoàn thành ca khám: ${error.message}`);
    throw error;
  }
};
