import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as specialtyService from "./specialty.service.js";

export const getSpecialties = asyncHandler(async (req, res) => {
  const result = await specialtyService.getSpecialties(req.query);
  sendSuccess(res, StatusCodes.OK, "Lấy danh mục thành công.", result);
});

export const createSpecialty = asyncHandler(async (req, res) => {
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  // Truyền file vào data (nếu có)
  const data = { ...req.body, file: req.file };

  const result = await specialtyService.createSpecialty(
    data,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.CREATED, result.message, result.specialty);
});

export const updateSpecialty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const data = { ...req.body, file: req.file };

  const result = await specialtyService.updateSpecialty(
    id,
    data,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

export const toggleSpecialtyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'deactivate' hoặc 'reactivate'
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await specialtyService.toggleSpecialtyStatus(
    id,
    action,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});
