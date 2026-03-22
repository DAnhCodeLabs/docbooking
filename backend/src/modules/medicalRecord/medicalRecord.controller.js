import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as medicalRecordService from "./medicalRecord.service.js";

export const getMedicalRecords = asyncHandler(async (req, res) => {
  const records = await medicalRecordService.getMedicalRecords(req.user._id);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách hồ sơ thành công.", records);
});

export const createMedicalRecord = asyncHandler(async (req, res) => {
  const record = await medicalRecordService.createMedicalRecord(
    req.user._id,
    req.body,
  );
  sendSuccess(res, StatusCodes.CREATED, "Tạo hồ sơ thành công.", record);
});

export const updateMedicalRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const record = await medicalRecordService.updateMedicalRecord(
    req.user._id,
    id,
    req.body,
  );
  sendSuccess(res, StatusCodes.OK, "Cập nhật hồ sơ thành công.", record);
});

export const deleteMedicalRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await medicalRecordService.deleteMedicalRecord(
    req.user._id,
    id,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});
