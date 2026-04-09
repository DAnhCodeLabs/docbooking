import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../utils/ApiError.js"; // ✅ Thêm import
import sendSuccess from "../../utils/response.js";
import * as authService from "./auth.service.js";

// ==================== ĐĂNG KÝ ====================

export const register = asyncHandler(async (req, res) => {
  const userData = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.register(userData, ipAddress, userAgent);

  sendSuccess(res, StatusCodes.CREATED, result.message, {
    userId: result.userId,
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.verifyEmail(
    email,
    otp,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.resendOtp(email, ipAddress, userAgent);

  sendSuccess(res, StatusCodes.OK, result.message);
});

// ==================== QUÊN MẬT KHẨU ====================

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.forgotPassword(email, ipAddress, userAgent);

  sendSuccess(res, StatusCodes.OK, result.message);
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.verifyResetOtp(
    email,
    otp,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message, {
    resetToken: result.resetToken,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.resetPassword(
    token,
    password,
    ipAddress,
    userAgent,
  );

  sendSuccess(res, StatusCodes.OK, result.message);
});

// ==================== ĐĂNG NHẬP ====================

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.login(email, password, ipAddress, userAgent);

  // Set refresh token trong cookie httpOnly
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });

  // Trả accessToken + user info
  // ✅ Refresh token sẽ được browser tự gửi qua cookie khi gọi /auth/refresh-token
  sendSuccess(res, StatusCodes.OK, "Đăng nhập thành công.", {
    accessToken: result.accessToken, // Frontend dùng này cho các request
    user: result.user,
  });
});

// ==================== REFRESH TOKEN ====================

export const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Không tìm thấy refresh token.",
    );
  }

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.refreshAccessToken(
    refreshToken,
    ipAddress,
    userAgent,
  );

  // Set cookie mới với refresh token mới
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });

  // Chỉ trả về access token trong body
  sendSuccess(res, StatusCodes.OK, "Làm mới token thành công.", {
    accessToken: result.accessToken,
  });
});

// ==================== ĐĂNG XUẤT ====================
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    // Nếu không có token, vẫn coi như đăng xuất
    return sendSuccess(res, StatusCodes.OK, "Đăng xuất thành công.");
  }

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  await authService.logout(refreshToken, ipAddress, userAgent);

  // Xóa cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  sendSuccess(res, StatusCodes.OK, "Đăng xuất thành công.");
});

// Đăng xuất tất cả (yêu cầu access token)
export const logoutAll = asyncHandler(async (req, res) => {
  const userId = req.user._id; // từ middleware protect
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  const result = await authService.logoutAll(userId, ipAddress, userAgent);

  sendSuccess(res, StatusCodes.OK, result.message);
});
