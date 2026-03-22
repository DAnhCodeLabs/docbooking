import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as clinicLeadService from "./clinicLead.service.js";

export const registerClinicLead = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Truyền file vào data
  const data = { ...req.body, file: req.file };

  const result = await clinicLeadService.registerClinicLead(data, ipAddress);

  sendSuccess(res, StatusCodes.CREATED, result.message, {
    leadId: result.leadId,
  });
});

export const reviewClinicLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await clinicLeadService.reviewClinicLead(
    id,
    status,
    reason,
    adminId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

export const getClinicLeads = asyncHandler(async (req, res) => {
  // Lấy toàn bộ tham số từ URL query (VD: ?page=1&limit=10&status=pending)
  const result = await clinicLeadService.getClinicLeads(req.query);

  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách phòng khám thành công",
    result,
  );
});

export const getPublicClinics = asyncHandler(async (req, res) => {
  const result = await clinicLeadService.getPublicClinics(req.query);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách phòng khám thành công.",
    result,
  );
});

export const lockClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await clinicLeadService.lockClinic(
    id,
    reason,
    adminId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

// MỞ KHÓA PHÒNG KHÁM
export const unlockClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await clinicLeadService.unlockClinic(
    id,
    adminId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

// XÓA MỀM PHÒNG KHÁM
export const softDeleteClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await clinicLeadService.softDeleteClinic(
    id,
    reason,
    adminId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});
