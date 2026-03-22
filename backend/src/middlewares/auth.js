import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";
/**
 * Middleware bảo vệ route: yêu cầu access token hợp lệ
 * Access token được gửi qua header Authorization (Bearer)
 */
export const protect = asyncHandler(async (req, res, next) => {
  // 1. Lấy token từ header
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
      true,
    );
  }

  // 2. Xác thực access token
  const decoded = verifyAccessToken(token);

  // 3. Kiểm tra user tồn tại, không bị banned hoặc đã bị vô hiệu hóa
  // Sửa lỗi: Đảm bảo select trường deactivatedAt để kiểm tra xóa mềm
  const user = await User.findById(decoded.id).select(
    "+status +role +passwordChangedAt +deactivatedAt",
  );
  if (!user) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Người dùng không còn tồn tại.",
      true,
    );
  }
  if (!user.emailVerified) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản chưa được xác thực email. Vui lòng kiểm tra email để xác thực.",
      true,
    );
  }
  if (user.status === "banned") {
    throw new ApiError(StatusCodes.FORBIDDEN, "Tài khoản đã bị khóa.", true);
  }

  // Sửa lỗi: Nếu user bị xóa mềm khi token vẫn còn hạn, lập tức chặn quyền truy cập
  if (user.status === "inactive" && user.deactivatedAt) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản của bạn đã bị vô hiệu hóa.",
      true,
    );
  }
  // 4. Kiểm tra thay đổi mật khẩu
  if (user.changedPasswordAfter(decoded.iat)) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.",
      true,
    );
  }

  req.user = user;
  next();
});
/**
 * Middleware phân quyền: chỉ cho phép các role được chỉ định
 * @param  {...string} roles - Các role được phép (ví dụ: 'admin', 'doctor')
 * @returns {Function} - Express middleware
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra req.user đã tồn tại (phải gọi protect trước)
    if (!req.user) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Lỗi hệ thống: không tìm thấy thông tin người dùng.",
        false,
      );
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền thực hiện hành động này.",
        true,
      );
    }
    next();
  };
};
