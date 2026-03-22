import { StatusCodes } from "http-status-codes";
import AuditLog from "../../models/AuditLog.js";
import Leave from "../../models/Leave.js";
import Schedule from "../../models/Schedule.js";
import Slot from "../../models/Slot.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";

// 1. ĐĂNG KÝ NGÀY NGHỈ
export const createLeave = async (data, doctorId, ipAddress, userAgent) => {
  const { date, startTime, endTime, reason } = data;

  // Chuẩn hóa ngày về 00:00:00 UTC
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (targetDate < today) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể đăng ký nghỉ cho ngày trong quá khứ.",
    );
  }

  // Kiểm tra trùng lặp leave
  const existingLeave = await Leave.findOne({
    doctor: doctorId,
    date: targetDate,
    status: { $ne: "cancelled" },
  });
  if (existingLeave) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Bạn đã có đăng ký nghỉ trong ngày này. Vui lòng hủy đăng ký cũ trước khi tạo mới.",
    );
  }

  // BƯỚC 1: QUÉT XUNG ĐỘT (Conflict Scan)
  const schedule = await Schedule.findOne({
    doctor: doctorId,
    date: targetDate,
  });
  let slotsToBlock = [];

  if (schedule) {
    // Lấy các Slot nằm trong khung giờ xin nghỉ
    const affectedSlots = await Slot.find({
      scheduleId: schedule._id,
      startTime: { $gte: startTime },
      endTime: { $lte: endTime },
    });

    // Kiểm tra xem có Slot nào đã có người đặt không
    const bookedSlots = affectedSlots.filter((s) => s.status === "booked");
    if (bookedSlots.length > 0) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Không thể khóa lịch. Đã có ${bookedSlots.length} bệnh nhân đặt lịch trong khoảng thời gian này. Vui lòng hủy các cuộc hẹn trước khi đăng ký nghỉ.`,
      );
    }

    // Lọc ra các Slot đang trống để chuẩn bị khóa
    slotsToBlock = affectedSlots.filter((s) => s.status === "available");
  }

  let newLeave = await Leave.create({
    doctor: doctorId,
    date: targetDate,
    startTime,
    endTime,
    reason,
  });

  // BƯỚC 3: CẬP NHẬT TRẠNG THÁI SLOT THÀNH BLOCKED (FIX RACE CONDITION)
  if (slotsToBlock.length > 0) {
    const slotIds = slotsToBlock.map((s) => s._id);

    // Bổ sung cứng điều kiện status: "available" để chống Race Condition
    const updateResult = await Slot.updateMany(
      {
        _id: { $in: slotIds },
        status: "available", // <-- Chỉ cập nhật nếu Slot VẪN ĐANG available
      },
      { $set: { status: "blocked", leaveId: newLeave._id } },
    );

    // Kiểm tra xem số lượng update thành công có khớp với số lượng dự tính không
    if (updateResult.modifiedCount !== slotsToBlock.length) {
      // Đã xảy ra Race Condition: Có slot bị đặt ngay giữa quá trình quét và khóa.
      // BƯỚC 3.1: MANUAL ROLLBACK

      // 1. Xóa bản ghi Leave vừa tạo
      await Leave.findByIdAndDelete(newLeave._id);

      // 2. Mở khóa lại (revert) những slot đã lỡ bị block trong batch này (nếu có)
      await Slot.updateMany(
        { leaveId: newLeave._id },
        { $set: { status: "available", leaveId: null } },
      );

      // 3. Ném lỗi ra để ngừng quy trình
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Rất tiếc, đã có bệnh nhân vừa đặt lịch vào khung giờ này. Vui lòng kiểm tra lại lịch khám và thử lại.",
      );
    }
  }

  await AuditLog.create({
    userId: doctorId,
    action: "CREATE_LEAVE",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { date, startTime, endTime, blockedSlots: slotsToBlock.length },
  });

  return {
    message: "Đăng ký ngày nghỉ thành công.",
    blockedSlots: slotsToBlock.length,
  };
};

// 2. HỦY NGÀY NGHỈ (MỞ LẠI LỊCH)
export const cancelLeave = async (leaveId, doctorId, ipAddress, userAgent) => {
  const leave = await Leave.findById(leaveId);
  if (!leave)
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy thông tin ngày nghỉ.",
    );

  // Quyền sở hữu
  if (leave.doctor.toString() !== doctorId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền thao tác trên dữ liệu của người khác.",
    );
  }

  if (leave.status === "cancelled") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Ngày nghỉ này đã được hủy từ trước.",
    );
  }

  // Đổi trạng thái Leave thành cancelled
  leave.status = "cancelled";
  await leave.save();

  // Mở khóa (Unblock) toàn bộ các Slot đang bị khóa bởi Leave này
  const result = await Slot.updateMany(
    { leaveId: leave._id, status: "blocked" },
    { $set: { status: "available", leaveId: null } },
  );

  await AuditLog.create({
    userId: doctorId,
    action: "CANCEL_LEAVE",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { leaveId: leave._id, unblockedSlots: result.modifiedCount },
  });

  return { message: "Hủy ngày nghỉ thành công. Các ca khám đã được mở lại." };
};

// 3. LẤY DANH SÁCH NGÀY NGHỈ (Dành cho Dashboard Bác sĩ)
export const getLeaves = async (query, doctorId) => {
  let baseFilter = { doctor: doctorId };

  const apiQuery = { ...query };

  if (apiQuery.startDate || apiQuery.endDate) {
    baseFilter.date = {};
    if (apiQuery.startDate) baseFilter.date.$gte = new Date(apiQuery.startDate);
    if (apiQuery.endDate) baseFilter.date.$lte = new Date(apiQuery.endDate);

    delete apiQuery.startDate;
    delete apiQuery.endDate;
  }

  // Khởi tạo ApiFeatures với baseFilter đã có sẵn ngày tháng
  const features = new ApiFeatures(Leave.find(baseFilter), apiQuery)
    .filter()
    .sort()
    .paginate();

  const leaves = await features.query;

  // Clone bộ lọc để đếm tổng số trang chuẩn xác
  const filterQuery = new ApiFeatures(Leave.find(baseFilter), apiQuery).filter()
    .query;
  const total = await Leave.countDocuments(filterQuery.getFilter());

  return { leaves, total };
};
