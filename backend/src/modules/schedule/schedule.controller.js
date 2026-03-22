import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as scheduleService from "./schedule.service.js";

export const createSchedule = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const doctorId = req.user._id;

  const { date, dateRange, shifts, slotDuration } = req.body;

  const result = await scheduleService.createSchedule(
    { doctorId, date, dateRange, shifts, slotDuration },
    req.user._id,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.CREATED, result.message, {
    successCount: result.successCount,
    failureCount: result.failureCount,
    details: result.details,
  });
});

export const toggleSlotStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await scheduleService.toggleSlotStatus(
    id,
    action,
    req.user._id,
    req.user.role,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

// Bổ sung vào file src/modules/schedule/schedule.controller.js

export const getSchedules = asyncHandler(async (req, res) => {
  const result = await scheduleService.getSchedules(req.query, req.user);

  sendSuccess(res, StatusCodes.OK, "Lấy danh sách lịch làm việc thành công.", {
    schedules: result.schedules,
    total: result.total,
    page: req.query.page ? parseInt(req.query.page) : 1,
    limit: req.query.limit ? parseInt(req.query.limit) : 10,
  });
});

export const getScheduleSlots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await scheduleService.getScheduleSlots(id, req.user);

  sendSuccess(res, StatusCodes.OK, "Lấy chi tiết ca khám thành công.", result);
});
