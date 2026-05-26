import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import {
  parseDateToUTC,
  getTodayLocalRange,
  getYesterdayLocalRange,
  getTomorrowLocalRange, // <-- Thêm mới
  getWeekLocalRange, // <-- Có sẵn
  getMonthLocalRange,
} from "../../utils/date.js";
import sendSuccess from "../../utils/response.js";
import * as appointmentService from "./appointment.service.js";
dayjs.extend(utc);

export const createAppointment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const origin =
    req.headers.origin || req.headers.referer || "http://localhost:3000";
  const clientIp = req.ip || req.connection.remoteAddress || "127.0.0.1";
  const result = await appointmentService.createAppointment(
    userId,
    req.body,
    origin,
    clientIp,
  );
  if (result.paymentUrl) {
    sendSuccess(res, StatusCodes.CREATED, "Chuyển đến trang thanh toán.", {
      paymentUrl: result.paymentUrl,
    });
  } else {
    sendSuccess(res, StatusCodes.CREATED, "Đặt lịch thành công.", result);
  }
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fallback: đảm bảo dateFrom/dateTo là Date object
  if (req.query.dateFrom && typeof req.query.dateFrom === "string") {
    req.query.dateFrom = parseDateToUTC(req.query.dateFrom);
  }
  if (req.query.dateTo && typeof req.query.dateTo === "string") {
    req.query.dateTo = dayjs.utc(req.query.dateTo).endOf("day").toDate();
  }

  const result = await appointmentService.getMyAppointments(userId, req.query);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách cuộc hẹn thành công.",
    result,
  );
});

// ==================== GET ALL APPOINTMENTS (admin, clinic_admin, doctor) ====================
export const getAppointments = asyncHandler(async (req, res) => {
  console.log("\n--- [DEBUG Backend Controller] BẮT ĐẦU YÊU CẦU GET APPOINTMENTS ---");
  console.log("[DEBUG Controller] 1. req.query nhận được từ Frontend:", req.query);

  // [SỬA LỖI GỐC RỄ Ở ĐÂY]: Tạo bản sao của req.query để tránh bị chặn bởi Middleware Read-only
  const queryParams = { ...req.query };

  // Xử lý tiền định tuyến timePreset trên BẢN SAO queryParams
  if (queryParams.timePreset && queryParams.timePreset !== "all" && queryParams.timePreset !== "custom") {
    let range;
    switch (queryParams.timePreset) {
      case "today": range = getTodayLocalRange(); break;
      case "yesterday": range = getYesterdayLocalRange(); break;
      case "tomorrow": range = getTomorrowLocalRange(); break;
      case "this_week": range = getWeekLocalRange(0); break;
      case "last_week": range = getWeekLocalRange(-1); break;
      case "next_week": range = getWeekLocalRange(1); break;
      case "this_month": range = getMonthLocalRange(0); break;
      case "last_month": range = getMonthLocalRange(-1); break;
      case "next_month": range = getMonthLocalRange(1); break;
    }

    if (range) {
      queryParams.dateFrom = range.startUTC;
      queryParams.dateTo = range.endUTC;
      queryParams.strictDate = true; // Cờ đánh dấu để Service lọc triệt để

      console.log(`[DEBUG Controller] 2. Đã quy đổi timePreset '${queryParams.timePreset}' thành:`, {
        dateFrom: queryParams.dateFrom,
        dateTo: queryParams.dateTo,
        strictDate: queryParams.strictDate
      });
    }
  } else if (queryParams.timePreset === "all") {
    // Nếu chọn 'Toàn bộ', xóa cờ date để lấy full
    delete queryParams.dateFrom;
    delete queryParams.dateTo;
    console.log("[DEBUG Controller] 2. timePreset là 'all', đã xóa dateFrom/dateTo để lấy toàn bộ.");
  } else {
    // Luồng CŨ Fallback (Tùy chỉnh)
    if (queryParams.dateFrom && typeof queryParams.dateFrom === "string") {
      queryParams.dateFrom = parseDateToUTC(queryParams.dateFrom);
    }
    if (queryParams.dateTo && typeof queryParams.dateTo === "string") {
      queryParams.dateTo = dayjs.utc(queryParams.dateTo).endOf("day").toDate();
    }
    console.log("[DEBUG Controller] 2. Chạy luồng CŨ Fallback (Tùy chỉnh):", {
      dateFrom: queryParams.dateFrom,
      dateTo: queryParams.dateTo
    });
  }

  console.log("[DEBUG Controller] 3. queryParams cuối cùng truyền xuống Service:", queryParams);

  // [ĐIỂM CHỐT]: Truyền queryParams thay vì req.query xuống Service[cite: 3, 5]
  const result = await appointmentService.getAppointments(req.user, queryParams);

  console.log("--- [DEBUG Backend Controller] KẾT THÚC YÊU CẦU GET APPOINTMENTS ---\n");

  sendSuccess(res, StatusCodes.OK, "Lấy danh sách lịch hẹn thành công.", result);
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";
  const result = await appointmentService.cancelAppointment(
    id,
    userId,
    reason,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message, {
    refundAmount: result.refundAmount,
  });
});

export const checkinAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await appointmentService.checkinAppointment(id, req.user);
  sendSuccess(res, StatusCodes.OK, result.message, result.data);
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(
    req.user,
    req.params.id,
  );
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy thông tin lịch hẹn thành công.",
    appointment,
  );
});

export const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctorId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await appointmentService.completeAppointment(
    id,
    doctorId,
    req.body,
    ipAddress,
    userAgent,
  );

  if (!result) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Hoàn thành ca khám thất bại, không nhận được kết quả từ service.",
    );
  }
  sendSuccess(res, StatusCodes.OK, result.message, result.consultation);
});
