import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as appointmentService from "./appointment.service.js";

export const createAppointment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const appointment = await appointmentService.createAppointment(
    userId,
    req.body,
  );
  sendSuccess(res, StatusCodes.CREATED, "Đặt lịch thành công.", appointment);
});

export const getMyAppointments = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await appointmentService.getMyAppointments(userId, req.query);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách cuộc hẹn thành công.",
    result,
  );
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;
  const result = await appointmentService.cancelAppointment(id, userId, reason);
  sendSuccess(res, StatusCodes.OK, result.message);
});

export const checkinAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const result = await appointmentService.checkinAppointment(id, userId);
  sendSuccess(res, StatusCodes.OK, result.message);
});
