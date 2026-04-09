import { StatusCodes } from "http-status-codes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import AuditLog from "../../models/AuditLog.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";
import logger from "../../utils/logger.js";
import PatientProfile from "../../models/PatientProfile.js";
import Schedule from "../../models/Schedule.js";
import Appointment from "../../models/Appointment.js";
import { getTodayUTC } from "../../utils/date.js";
import * as reviewService from "../review/review.service.js";

dayjs.extend(utc);
// ==========================================
// 1. LẤY DANH SÁCH (LOẠI TRỪ ADMIN)
// ==========================================
export const getUsers = async (query) => {
  const baseQuery = User.find({ role: { $ne: "admin" } });

  const features = new ApiFeatures(baseQuery, query)
    .search()
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Sửa: populate sâu cho doctorProfile
  const users = await features.query
    .populate({
      path: "patientProfile",
      select: "-__v",
    })
    .populate({
      path: "doctorProfile",
      select: "-__v",
      populate: [
        { path: "specialty", select: "name" }, // lấy tên chuyên khoa
        { path: "clinicId", select: "clinicName address" }, // lấy tên và địa chỉ phòng khám
      ],
    });

  const total = await features.countTotal(User);
  return { users, total };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .populate("patientProfile")
    .populate({
      path: "doctorProfile",
      populate: [
        { path: "specialty", select: "name" },
        { path: "clinicId", select: "clinicName address" },
      ],
    });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy người dùng.");
  }
  return user;
};
// ==========================================
// UTILS: HÀM KIỂM TRA QUYỀN THAO TÁC CHUNG
// ==========================================
/**
 * Master Dev: Gom logic kiểm tra quyền vào 1 hàm để tái sử dụng, tránh code duplicate.
 */
const validateAdminAction = (user, adminId) => {
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy người dùng.");
  }
  if (user._id.toString() === adminId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không thể tự thao tác lên tài khoản của chính mình.",
    );
  }
  if (user.role === "admin") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền thao tác lên tài khoản của Quản trị viên khác.",
    );
  }
};

// ==========================================
// 3. KHÓA TÀI KHOẢN (BAN)
// ==========================================
export const banUser = async (
  userId,
  banData,
  adminId,
  ipAddress,
  userAgent,
) => {
  const user = await User.findById(userId);

  validateAdminAction(user, adminId); // Kiểm tra ràng buộc nghiệp vụ

  // Ghi đè trạng thái và thông tin khóa
  user.status = "banned";
  user.bannedReason = banData.reason; // Đã bắt buộc từ validation
  user.bannedUntil = new Date(banData.bannedUntil); // Chuyển sang Date Object
  await user.save();

  await AuditLog.create({
    userId: user._id,
    action: "BAN_USER",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      bannedBy: adminId,
      reason: banData.reason,
      bannedUntil: banData.bannedUntil,
    },
  });

  logger.info(
    `User ${userId} banned by admin ${adminId} until ${banData.bannedUntil}`,
  );
  return { message: "Tài khoản đã bị khóa thành công." };
};

// ==========================================
// 4. MỞ KHÓA TÀI KHOẢN (UNBAN)
// ==========================================
export const unbanUser = async (userId, adminId, ipAddress, userAgent) => {
  const user = await User.findById(userId);

  validateAdminAction(user, adminId);

  if (user.status !== "banned") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Tài khoản này hiện không bị khóa.",
    );
  }

  user.status = "active";
  user.bannedReason = undefined;
  user.bannedUntil = undefined;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    action: "UNBAN_USER",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { unbannedBy: adminId },
  });

  logger.info(`User ${userId} unbanned by admin ${adminId}`);
  return { message: "Tài khoản đã được mở khóa." };
};

// ==========================================
// 5. XÓA MỀM (SOFT DELETE)
// ==========================================
export const softDeleteUser = async (userId, adminId, ipAddress, userAgent) => {
  const user = await User.findById(userId);
  validateAdminAction(user, adminId);
  if (user.status === "inactive" && user.deactivatedAt) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Tài khoản này đã bị vô hiệu hóa từ trước.",
    );
  }

    if (user.role === "doctor") {
      const today = getTodayUTC();

      // Kiểm tra schedule tương lai (lịch làm việc)
      const futureSchedules = await Schedule.countDocuments({
        doctor: userId,
        date: { $gte: today },
      });
      if (futureSchedules > 0) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          "Không thể vô hiệu hóa bác sĩ vì vẫn còn lịch làm việc trong tương lai. Vui lòng xóa hoặc hủy các lịch này trước.",
        );
      }

      // Kiểm tra appointment tương lai đã được đặt (confirmed/checked_in)
      const appointments = await Appointment.find({
        doctor: userId,
        status: { $in: ["confirmed", "checked_in"] },
      }).populate({
        path: "slot",
        populate: { path: "scheduleId", select: "date" },
      });

      const futureAppointments = appointments.filter((apt) => {
        const slotDate = apt.slot?.scheduleId?.date;
        return slotDate && new Date(slotDate) >= today;
      });

      if (futureAppointments.length > 0) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Không thể vô hiệu hóa bác sĩ vì còn ${futureAppointments.length} cuộc hẹn chưa diễn ra. Vui lòng hủy các cuộc hẹn này trước.`,
        );
      }
    }

  user.status = "inactive";
  user.deactivatedAt = new Date();
  await user.save();
  await AuditLog.create({
    userId: user._id,
    action: "SOFT_DELETE_USER",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { deletedBy: adminId },
  });
  return { message: "Tài khoản đã được vô hiệu hóa (xóa mềm)." };
};
