import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as leaveService from "./leave.service.js";

export const createLeave = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await leaveService.createLeave(
    req.body,
    req.user._id,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.CREATED, result.message, {
    blockedSlots: result.blockedSlots,
  });
});

export const cancelLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await leaveService.cancelLeave(
    id,
    req.user._id,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

export const getLeaves = asyncHandler(async (req, res) => {
  const result = await leaveService.getLeaves(req.query, req.user._id);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách ngày nghỉ thành công", {
    leaves: result.leaves,
    total: result.total,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });
});
