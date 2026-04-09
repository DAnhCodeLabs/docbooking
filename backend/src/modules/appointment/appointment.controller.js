import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { parseDateToUTC } from "../../utils/date.js";
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
  // Fallback parse dateFrom/dateTo
  if (req.query.dateFrom && typeof req.query.dateFrom === "string") {
    req.query.dateFrom = parseDateToUTC(req.query.dateFrom);
  }
  if (req.query.dateTo && typeof req.query.dateTo === "string") {
    req.query.dateTo = dayjs.utc(req.query.dateTo).endOf("day").toDate();
  }

  const result = await appointmentService.getAppointments(req.user, req.query);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách lịch hẹn thành công.",
    result,
  );
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
