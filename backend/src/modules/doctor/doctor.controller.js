import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../utils/ApiError.js";
import sendSuccess from "../../utils/response.js";
import * as doctorService from "./doctor.service.js";

export const registerDoctor = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  // Kiểm tra file có trong req.files (do parseFields để lại)
  if (!req.files || !req.files["avatarUrl"]) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Vui lòng tải lên ảnh chân dung (Avatar).",
    );
  }
  if (!req.files || !req.files["uploadedDocuments"]) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Vui lòng tải lên ít nhất 1 tài liệu chuyên môn (Bằng cấp/GPHN).",
    );
  }

  const result = await doctorService.submitDoctorOnboarding(
    req.body,
    req.files, // files là object từ parseFields
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.CREATED, result.message);
});

export const getPublicDoctors = asyncHandler(async (req, res) => {
  const result = await doctorService.getPublicDoctors(req.query);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách bác sĩ thành công.", {
    doctors: result.doctors,
    total: result.total,
    page: req.query.page ? parseInt(req.query.page) : 1,
    limit: req.query.limit ? parseInt(req.query.limit) : 10,
  });
});

export const getPublicDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query; // có thể undefined

  const doctor = await doctorService.getPublicDoctorById(id, {
    startDate,
    endDate,
  });

  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy thông tin chi tiết bác sĩ thành công.",
    doctor,
  );
});

// ==================== CÁC HÀM MỚI ====================

export const updateProfile = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const updateData = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await doctorService.updateProfile(
    doctorId,
    updateData,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message, result.profile);
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const file = req.file; // từ parseSingleFile
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  if (!file) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Vui lòng chọn file để tải lên.",
    );
  }

  const result = await doctorService.uploadDocument(
    doctorId,
    file,
    ipAddress,
    userAgent,
  );

  sendSuccess(
    res,
    StatusCodes.CREATED,
    "Tải lên chứng chỉ thành công.",
    result,
  );
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const { publicId } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await doctorService.deleteDocument(
    doctorId,
    publicId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

export const uploadActivityImage = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const file = req.file;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  if (!file) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Vui lòng chọn ảnh để tải lên.",
    );
  }

  const result = await doctorService.uploadActivityImage(
    doctorId,
    file,
    ipAddress,
    userAgent,
  );

  sendSuccess(
    res,
    StatusCodes.CREATED,
    "Tải lên ảnh hoạt động thành công.",
    result,
  );
});

export const deleteActivityImage = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const { publicId } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await doctorService.deleteActivityImage(
    doctorId,
    publicId,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const profile = await doctorService.getMyProfile(doctorId);
  sendSuccess(res, StatusCodes.OK, "Lấy thông tin hồ sơ thành công.", profile);
});

export const getClinicDoctors = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await doctorService.getClinicDoctors(userId, req.query);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách bác sĩ thành công.", result);
});

export const getClinicDoctorDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const doctor = await doctorService.getClinicDoctorDetail(id, userId);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy thông tin chi tiết bác sĩ thành công.",
    doctor,
  );
});

export const confirmDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await doctorService.confirmDoctor(
    id,
    userId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

export const rejectDoctorByClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await doctorService.rejectDoctorByClinic(
    id,
    userId,
    reason,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});