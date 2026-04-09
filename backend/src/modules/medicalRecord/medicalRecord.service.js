import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { StatusCodes } from "http-status-codes";
import Appointment from "../../models/Appointment.js";
import MedicalRecord from "../../models/MedicalRecord.js";
import ApiError from "../../utils/ApiError.js";
import { getTodayUTC } from "../../utils/date.js";

dayjs.extend(utc);

/**
 * Lấy danh sách hồ sơ của user hiện tại
 */
export const getMedicalRecords = async (userId) => {
  const records = await MedicalRecord.find({
    user: userId,
    isDeleted: false,
  }).sort({
    createdAt: -1,
  });
  return records;
};

/**
 * Tạo hồ sơ mới
 */
export const createMedicalRecord = async (userId, data) => {
  const existing = await MedicalRecord.findOne({ cccd: data.cccd });
  if (existing) {
    // Nếu hồ sơ cũ của chính user này bị xóa mềm -> Khôi phục và ghi đè data mới
    if (existing.isDeleted && existing.user.toString() === userId.toString()) {
      if (data.isDefault) {
        await MedicalRecord.updateMany({ user: userId }, { isDefault: false });
      }
      Object.assign(existing, data);
      existing.isDeleted = false;
      existing.deletedAt = null;
      await existing.save();
      return existing;
    }
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Căn cước công dân đã được đăng ký trong hệ thống.",
    );
  }

  if (data.isDefault) {
    await MedicalRecord.updateMany({ user: userId }, { isDefault: false });
  }

  const record = await MedicalRecord.create({ ...data, user: userId });
  return record;
};

/**
 * Cập nhật hồ sơ
 */
export const updateMedicalRecord = async (userId, recordId, data) => {
  const record = await MedicalRecord.findOne({ _id: recordId, user: userId });
  if (!record) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");
  }

  // Nếu cập nhật CCCD, kiểm tra trùng
  if (data.cccd && data.cccd !== record.cccd) {
    const existing = await MedicalRecord.findOne({ cccd: data.cccd });
    if (existing) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Căn cước công dân đã được đăng ký.",
      );
    }
  }

  // Xử lý isDefault
  if (data.isDefault) {
    await MedicalRecord.updateMany({ user: userId }, { isDefault: false });
  }

  Object.assign(record, data);
  await record.save();
  return record;
};

/**
 * Xóa hồ sơ
 */
export const deleteMedicalRecord = async (userId, recordId) => {
  const today = getTodayUTC();

  // Tìm các appointment có status chưa kết thúc và populate slot để lấy ngày
  const appointments = await Appointment.find({
    patientProfile: recordId,
    status: { $in: ["confirmed", "checked_in"] },
  }).populate({
    path: "slot",
    populate: { path: "scheduleId", select: "date" },
  });

  // Lọc những appointment có ngày >= hôm nay (tương lai hoặc hôm nay)
  const futureAppointments = appointments.filter((apt) => {
    const slotDate = apt.slot?.scheduleId?.date;
    return slotDate && new Date(slotDate) >= today;
  });

  if (futureAppointments.length > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Không thể xóa hồ sơ vì còn ${futureAppointments.length} cuộc hẹn chưa diễn ra. Vui lòng hủy các cuộc hẹn này trước.`,
    );
  }

  // 3. Xóa mềm thay vì Xóa vật lý
  const record = await MedicalRecord.findOne({ _id: recordId, user: userId });
  if (!record) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");
  }

  record.isDeleted = true;
  record.deletedAt = new Date();
  record.isDefault = false; 
  await record.save();

  return { message: "Đã xóa hồ sơ thành công." };
};
