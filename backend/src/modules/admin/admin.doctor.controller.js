import asyncHandler from "express-async-handler";
import * as adminDoctorService from "./admin.doctor.service.js";
import sendSuccess from "../../utils/response.js";
import { StatusCodes } from "http-status-codes";

export const getDoctorApplications = asyncHandler(async (req, res) => {
  const result = await adminDoctorService.getDoctorApplications(req.query);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách hồ sơ thành công.", result);
});

export const getDoctorApplicationById = asyncHandler(async (req, res) => {
  const result = await adminDoctorService.getDoctorApplicationById(req.params.id);
  sendSuccess(res, StatusCodes.OK, "Lấy chi tiết hồ sơ thành công.", result);
});

export const processDoctorApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await adminDoctorService.processDoctorApplication(
    id,
    action,
    reason,
    adminId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});
