import { StatusCodes } from "http-status-codes";
import ApiError from "../../utils/ApiError.js";
import MedicalRecord from "../../models/MedicalRecord.js";
import Appointment from "../../models/Appointment.js";

/**
 * Lấy danh sách hồ sơ của user hiện tại
 */
export const getMedicalRecords = async (userId) => {
  const records = await MedicalRecord.find({ user: userId }).sort({
    createdAt: -1,
  });
  return records;
};

/**
 * Tạo hồ sơ mới
 */
export const createMedicalRecord = async (userId, data) => {
  // Kiểm tra CCCD đã tồn tại chưa
  const existing = await MedicalRecord.findOne({ cccd: data.cccd });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Căn cước công dân đã được đăng ký.",
    );
  }

  // Nếu isDefault và chưa có default nào, set mặc định
  if (data.isDefault) {
    await MedicalRecord.updateMany({ user: userId }, { isDefault: false });
  }

  const record = await MedicalRecord.create({
    ...data,
    user: userId,
  });

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
  // Kiểm tra có appointment trong tương lai không
  const futureAppointments = await Appointment.findOne({
    patientProfile: recordId,
    status: { $in: ["confirmed", "checked_in"] },
    // Có thể lọc thêm startTime > now nếu cần, nhưng tạm thời chặn mọi appointment chưa kết thúc
  });
  if (futureAppointments) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể xóa hồ sơ vì đang có lịch hẹn trong tương lai.",
    );
  }

  const result = await MedicalRecord.deleteOne({ _id: recordId, user: userId });
  if (result.deletedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");
  }
  return { message: "Xóa hồ sơ thành công." };
};
