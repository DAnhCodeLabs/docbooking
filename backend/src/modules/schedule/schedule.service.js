import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AuditLog from "../../models/AuditLog.js";
import Schedule from "../../models/Schedule.js";
import Slot from "../../models/Slot.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";
import logger from "../../utils/logger.js";

/**
 * Thuật toán chia nhỏ khung giờ thành các Slot
 * @param {string} startStr - Giờ bắt đầu (VD: "08:00")
 * @param {string} endStr - Giờ kết thúc (VD: "12:00")
 * @param {number} durationMins - Thời lượng 1 ca (VD: 30 phút)
 */
const generateTimeSlots = (startStr, endStr, durationMins) => {
  const slots = [];
  const start = new Date(`1970-01-01T${startStr}:00Z`).getTime();
  const end = new Date(`1970-01-01T${endStr}:00Z`).getTime();
  const durationMs = durationMins * 60 * 1000;

  if (start >= end) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Giờ bắt đầu phải trước giờ kết thúc.",
    );
  }

  let current = start;
  while (current + durationMs <= end) {
    const slotStart = new Date(current).toISOString().substring(11, 16);
    const slotEnd = new Date(current + durationMs)
      .toISOString()
      .substring(11, 16);
    slots.push({ startTime: slotStart, endTime: slotEnd });
    current += durationMs;
  }
  return slots;
};

/**
 * Kiểm tra xung đột giữa các slot (overlap)
 */
const hasOverlap = (slotsArray) => {
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const sorted = [...slotsArray].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );
  for (let i = 0; i < sorted.length - 1; i++) {
    if (
      timeToMinutes(sorted[i].endTime) > timeToMinutes(sorted[i + 1].startTime)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Xử lý một ngày cụ thể: tạo schedule và slot
 * Trả về object: { success: boolean, message?: string, totalSlots?: number }
 */
const processSingleDay = async (
  doctorId,
  dateStr,
  shifts,
  slotDuration,
  actorId,
) => {
  const targetDate = new Date(dateStr);
  targetDate.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (targetDate < today) {
    return {
      success: false,
      message: `Ngày ${dateStr} không thể tạo vì là ngày trong quá khứ.`,
    };
  }

  // Sinh slot từ các ca
  let allGeneratedSlots = [];
  for (const shift of shifts) {
    if (shift.startTime >= shift.endTime) {
      return {
        success: false,
        message: `Ca làm việc từ ${shift.startTime} đến ${shift.endTime} không hợp lệ.`,
      };
    }
    const slots = generateTimeSlots(
      shift.startTime,
      shift.endTime,
      slotDuration,
    );
    allGeneratedSlots = [...allGeneratedSlots, ...slots];
  }

  if (allGeneratedSlots.length === 0) {
    return {
      success: false,
      message: "Thời gian làm việc quá ngắn để tạo dù chỉ 1 ca khám.",
    };
  }

  // Kiểm tra overlap nội bộ
  if (hasOverlap(allGeneratedSlots)) {
    return {
      success: false,
      message: "Các khung giờ bạn vừa chọn bị chồng chéo lên nhau.",
    };
  }

  // Tìm schedule hiện có
  let schedule = await Schedule.findOne({ doctor: doctorId, date: targetDate });

  if (schedule) {
    // Ngày đã có lịch -> kiểm tra overlap với slot cũ
    const existingSlots = await Slot.find({ scheduleId: schedule._id });
    const combinedSlots = [...existingSlots, ...allGeneratedSlots];
    if (hasOverlap(combinedSlots)) {
      return {
        success: false,
        message:
          "Khung giờ mới bị trùng lặp với các ca khám đã tạo trước đó trong ngày này.",
      };
    }

    // Thêm slot mới
    const slotsToInsert = allGeneratedSlots.map((slot) => ({
      ...slot,
      scheduleId: schedule._id,
      status: "available",
    }));
    await Slot.insertMany(slotsToInsert);
    schedule.totalSlots += allGeneratedSlots.length;
    await schedule.save();
  } else {
    // Tạo mới schedule
    schedule = await Schedule.create({
      doctor: doctorId,
      date: targetDate,
      totalSlots: allGeneratedSlots.length,
    });

    const slotsToInsert = allGeneratedSlots.map((slot) => ({
      ...slot,
      scheduleId: schedule._id,
      status: "available",
    }));

    try {
      await Slot.insertMany(slotsToInsert);
    } catch (err) {
      // Rollback: xóa schedule vừa tạo
      await Schedule.deleteOne({ _id: schedule._id });
      return {
        success: false,
        message: "Lỗi lưu dữ liệu, vui lòng thử lại.",
      };
    }
  }

  return {
    success: true,
    totalSlots: allGeneratedSlots.length,
    date: dateStr,
  };
};

// 1. TẠO LỊCH LÀM VIỆC (VỚI TRANSACTION)
export const createSchedule = async (data, actorId, ipAddress, userAgent) => {
  const { doctorId, date, dateRange, shifts, slotDuration } = data;

  // Xác định danh sách ngày cần xử lý
  let datesToProcess = [];
  if (date) {
    datesToProcess = [date];
  } else if (dateRange) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      datesToProcess.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
  }

  // Xử lý từng ngày
  const results = [];
  for (const d of datesToProcess) {
    const dayResult = await processSingleDay(
      doctorId,
      d,
      shifts,
      slotDuration,
      actorId,
    );
    results.push({ date: d, ...dayResult });
  }

  // Tổng hợp kết quả
  const successResults = results.filter((r) => r.success);
  const failureResults = results.filter((r) => !r.success);

  // Ghi audit log tổng hợp
  await AuditLog.create({
    userId: actorId,
    action: "CREATE_SCHEDULE",
    status: failureResults.length === 0 ? "SUCCESS" : "PARTIAL_SUCCESS",
    ipAddress,
    userAgent,
    details: {
      totalDays: datesToProcess.length,
      successDays: successResults.length,
      failureDays: failureResults.length,
      failures: failureResults.map((f) => ({
        date: f.date,
        reason: f.message,
      })),
    },
  });

  logger.info(
    `Tạo lịch làm việc: thành công ${successResults.length}/${datesToProcess.length} ngày`,
  );

  // Nếu không có ngày nào thành công, throw lỗi
  if (successResults.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể tạo lịch cho bất kỳ ngày nào. Chi tiết: " +
        failureResults.map((f) => `${f.date}: ${f.message}`).join("; "),
    );
  }

  return {
    message:
      failureResults.length === 0
        ? `Tạo lịch làm việc thành công cho ${successResults.length} ngày.`
        : `Tạo lịch thành công cho ${successResults.length} ngày, thất bại ${failureResults.length} ngày.`,
    successCount: successResults.length,
    failureCount: failureResults.length,
    details: {
      success: successResults.map((r) => ({
        date: r.date,
        totalSlots: r.totalSlots,
      })),
      failure: failureResults.map((r) => ({ date: r.date, reason: r.message })),
    },
  };
};

// 2. KHÓA / MỞ KHÓA SLOT (BLOCK / UNBLOCK)
export const toggleSlotStatus = async (
  slotId,
  action,
  actorId,
  actorRole,
  ipAddress,
  userAgent,
) => {
  const slot = await Slot.findById(slotId).populate("scheduleId");
  if (!slot)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy ca khám này.");

  // Quyền: Chỉ admin hoặc chính bác sĩ sở hữu lịch mới được thao tác
  if (
    actorRole !== "admin" &&
    actorId.toString() !== slot.scheduleId.doctor.toString()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền thao tác trên slot này.",
    );
  }

  if (slot.status === "booked") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Ca khám này đã có bệnh nhân đặt, không thể khóa. Vui lòng hủy lịch hẹn trước.",
    );
  }

  if (slot.leaveId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Slot này đang liên kết với lịch nghỉ phép. Không thể thao tác thủ công. Vui lòng hủy lịch nghỉ trước.",
    );
  }

  const newStatus = action === "block" ? "blocked" : "available";
  if (slot.status === newStatus) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Ca khám đang ở trạng thái ${newStatus} rồi.`,
    );
  }
  slot.status = newStatus;
  await slot.save();

  await AuditLog.create({
    userId: actorId,
    action: action === "block" ? "BLOCK_SLOT" : "UNBLOCK_SLOT",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { slotId: slot._id, startTime: slot.startTime },
  });

  return {
    message: action === "block" ? "Đã khóa ca khám." : "Đã mở khóa ca khám.",
  };
};

// 3. LẤY DANH SÁCH LỊCH LÀM VIỆC (CÓ PHÂN TRANG & LỌC)
export const getSchedules = async (query, user) => {
  let baseFilter = {};

  // a. Phân quyền truy cập dữ liệu (Data Isolation)
  if (user.role === "doctor") {
    baseFilter.doctor = user._id; // Bác sĩ KHÔNG THỂ xem lịch người khác
  } else if (user.role === "admin" && query.doctorId) {
    baseFilter.doctor = query.doctorId; // Admin lọc theo bác sĩ
  }

  // b. Lọc theo khoảng thời gian (Phục vụ render Calendar Frontend)
  if (query.startDate || query.endDate) {
    baseFilter.date = {};
    if (query.startDate) baseFilter.date.$gte = new Date(query.startDate);
    if (query.endDate) baseFilter.date.$lte = new Date(query.endDate);
  }

  // c. Tận dụng ApiFeatures để phân trang và sắp xếp
  const features = new ApiFeatures(Schedule.find(baseFilter), query)
    .sort()
    .paginate();

  // d. Lấy dữ liệu và Populate thông tin bác sĩ
  let schedules = await features.query.populate({
    path: "doctor",
    select: "fullName email phone avatar",
  });

  // Nếu yêu cầu include slots
  if (query.includeSlots === "true") {
    const scheduleIds = schedules.map((s) => s._id);
    const slots = await Slot.find({ scheduleId: { $in: scheduleIds } }).sort({
      startTime: 1,
    });
    // Gắn slots vào từng schedule
    schedules = schedules.map((schedule) => ({
      ...schedule.toObject(),
      slots: slots.filter(
        (slot) => slot.scheduleId.toString() === schedule._id.toString(),
      ),
    }));
  }

  const total = await Schedule.countDocuments(baseFilter);
  return { schedules, total };
};

// 4. LẤY CHI TIẾT CÁC CA KHÁM (SLOTS) CỦA 1 NGÀY
export const getScheduleSlots = async (scheduleId, user) => {
  const schedule = await Schedule.findById(scheduleId).populate(
    "doctor",
    "fullName email",
  );

  if (!schedule) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy lịch làm việc này.",
    );
  }

  // Chặn bác sĩ A xem lén chi tiết ca khám của bác sĩ B
  if (
    user.role === "doctor" &&
    schedule.doctor._id.toString() !== user._id.toString()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền xem chi tiết lịch của bác sĩ khác.",
    );
  }

  // Lấy toàn bộ Slot của ngày hôm đó, sắp xếp theo thời gian tăng dần (08:00 -> 17:00)
  const slots = await Slot.find({ scheduleId }).sort({ startTime: 1 });

  return { schedule, slots };
};

export const getDoctorSchedules = async (doctorId, startDate, endDate) => {
  // Kiểm tra startDate <= endDate
  if (startDate > endDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
    );
  }

  const pipeline = [
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $sort: { date: 1 } },
    {
      $lookup: {
        from: "slots",
        localField: "_id",
        foreignField: "scheduleId",
        as: "slots",
      },
    },
    {
      $project: {
        date: 1,
        totalSlots: { $size: "$slots" },
        availableSlots: {
          $size: {
            $filter: {
              input: "$slots",
              as: "slot",
              cond: { $eq: ["$$slot.status", "available"] },
            },
          },
        },
        hasLeave: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: "$slots",
                  as: "slot",
                  cond: { $ne: ["$$slot.leaveId", null] },
                },
              },
            },
            0,
          ],
        },
      },
    },
  ];

  const schedules = await Schedule.aggregate(pipeline);
  return schedules;
};
