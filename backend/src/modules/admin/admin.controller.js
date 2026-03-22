import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import * as adminService from "./admin.service.js";
import sendSuccess from "../../utils/response.js";

// Lấy danh sách người dùng
export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  sendSuccess(res, StatusCodes.OK, "Lấy danh sách người dùng thành công.", {
    users: result.users,
    total: result.total,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  });
});

// Xem chi tiết người dùng
export const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy thông tin người dùng thành công.",
    user,
  );
});

// Khóa tài khoản
export const banUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, bannedUntil } = req.body;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await adminService.banUser(
    id,
    { reason, bannedUntil },
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

// Mở khóa tài khoản
export const unbanUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await adminService.unbanUser(
    id,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

// Xóa mềm tài khoản
export const softDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await adminService.softDeleteUser(
    id,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});

// Xóa cứng tài khoản
export const hardDeleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await adminService.hardDeleteUser(
    id,
    adminId,
    ipAddress,
    userAgent,
  );
  sendSuccess(res, StatusCodes.OK, result.message);
});
