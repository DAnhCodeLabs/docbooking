import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import AuditLog from "../../models/AuditLog.js";
import Otp from "../../models/Otp.js";
import RefreshToken from "../../models/RefreshToken.js";
import ResetToken from "../../models/ResetToken.js"; // Thêm import
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import {
  sendPasswordResetOtp,
  sendVerificationOtp,
} from "../../utils/email.js"; // Thêm hàm gửi OTP quên mật khẩu
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import logger from "../../utils/logger.js";
import { generateOtp, hashOtp, verifyOtp } from "../../utils/otp.js";

// ==================== ĐĂNG KÝ ====================

export const register = async (userData, ipAddress, userAgent) => {
  const { email, password, fullName, gender, phone } = userData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.",
    );
  }

  const user = await User.create({
    email,
    password,
    fullName,
    phone,
    gender,
    role: "patient",
    status: "inactive",
    emailVerified: false,
  });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.deleteMany({ email, purpose: "email_verification" });
  await Otp.create({
    email,
    otpHash,
    purpose: "email_verification",
    expiresAt,
  });

  try {
    await sendVerificationOtp(email, otp);
  } catch (error) {
    logger.error(`Gửi OTP thất bại cho ${email}: ${error.message}`);
  }

  await AuditLog.create({
    userId: user._id,
    action: "REGISTER",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email },
  });

  logger.info(`User registered: ${email}`);

  return {
    userId: user._id,
    email: user.email,
    message:
      "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
  };
};

export const verifyEmail = async (email, otp, ipAddress, userAgent) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy tài khoản với email này.",
    );
  }

  if (user.emailVerified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Tài khoản đã được xác thực trước đó.",
    );
  }

  const otpRecord = await Otp.findOne({
    email,
    purpose: "email_verification",
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.",
    );
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.",
    );
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu gửi lại.",
    );
  }

  const isValid = await verifyOtp(otp, otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    await AuditLog.create({
      userId: user._id,
      action: "VERIFY_EMAIL",
      status: "FAILURE",
      ipAddress,
      userAgent,
      details: { email, reason: "Sai OTP" },
    });

    throw new ApiError(StatusCodes.BAD_REQUEST, "Mã OTP không chính xác.");
  }

  user.emailVerified = true;
  user.status = "active";
  await user.save();

  await Otp.deleteOne({ _id: otpRecord._id });

  await AuditLog.create({
    userId: user._id,
    action: "VERIFY_EMAIL",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email },
  });

  logger.info(`Email verified for ${email}`);

  return { message: "Xác thực email thành công. Tài khoản đã được kích hoạt." };
};

export const resendOtp = async (email, ipAddress, userAgent) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy tài khoản với email này.",
    );
  }

  if (user.emailVerified) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Tài khoản đã được xác thực, không cần gửi lại OTP.",
    );
  }

  const recentOtp = await Otp.findOne({
    email,
    purpose: "email_verification",
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });
  if (recentOtp) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Bạn vừa yêu cầu gửi OTP gần đây. Vui lòng đợi 1 phút trước khi thử lại.",
    );
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.deleteMany({ email, purpose: "email_verification" });
  await Otp.create({
    email,
    otpHash,
    purpose: "email_verification",
    expiresAt,
  });

  await sendVerificationOtp(email, otp);

  await AuditLog.create({
    userId: user._id,
    action: "REGISTER",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email, type: "resend_otp" },
  });

  logger.info(`OTP resent to ${email}`);

  return { message: "Mã OTP đã được gửi lại. Vui lòng kiểm tra email." };
};

// ==================== QUÊN MẬT KHẨU ====================

/**
 * Gửi OTP đặt lại mật khẩu
 */
export const forgotPassword = async (email, ipAddress, userAgent) => {
  const user = await User.findOne({ email });
  if (!user) {
    // Trả về thông báo chung để tránh lộ email
    logger.info(`Yêu cầu quên mật khẩu cho email không tồn tại: ${email}`);
    // Vẫn ghi log nhưng không throw lỗi
    return {
      message:
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
    };
  }

  // Kiểm tra rate limit gửi OTP (có thể dùng chung với resend)
  const recentOtp = await Otp.findOne({
    email,
    purpose: "password_reset",
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });
  if (recentOtp) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Bạn vừa yêu cầu gửi OTP gần đây. Vui lòng đợi 1 phút trước khi thử lại.",
    );
  }

  // Tạo OTP
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Xóa OTP cũ cùng loại
  await Otp.deleteMany({ email, purpose: "password_reset" });

  await Otp.create({
    email,
    otpHash,
    purpose: "password_reset",
    expiresAt,
  });

  // Gửi email
  await sendPasswordResetOtp(email, otp);

  // Audit log
  await AuditLog.create({
    userId: user._id,
    action: "PASSWORD_RESET",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email, step: "send_otp" },
  });

  logger.info(`Password reset OTP sent to ${email}`);

  return {
    message:
      "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
  };
};

/**
 * Xác thực OTP quên mật khẩu và trả về token đặt lại
 */
export const verifyResetOtp = async (email, otp, ipAddress, userAgent) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy tài khoản với email này.",
    );
  }

  // Tìm OTP
  const otpRecord = await Otp.findOne({
    email,
    purpose: "password_reset",
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại.",
    );
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.",
    );
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu gửi lại.",
    );
  }

  const isValid = await verifyOtp(otp, otpRecord.otpHash);
  if (!isValid) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET",
      status: "FAILURE",
      ipAddress,
      userAgent,
      details: { email, step: "verify_otp", reason: "Sai OTP" },
    });

    throw new ApiError(StatusCodes.BAD_REQUEST, "Mã OTP không chính xác.");
  }

  // OTP đúng, xóa OTP này
  await Otp.deleteOne({ _id: otpRecord._id });

  // Tạo token đặt lại mật khẩu (ngẫu nhiên, lưu vào ResetToken)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex"); // lưu hash để an toàn

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
  await ResetToken.create({
    userId: user._id,
    token: hashedToken,
    expiresAt,
  });

  // Audit log
  await AuditLog.create({
    userId: user._id,
    action: "PASSWORD_RESET",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email, step: "verify_otp_success" },
  });

  logger.info(`OTP verified for password reset: ${email}`);

  // Trả về token plain cho client (client sẽ dùng token này ở bước tiếp theo)
  return {
    resetToken, // token plain để client gửi lên cùng mật khẩu mới
    message: "Xác thực OTP thành công. Vui lòng đặt mật khẩu mới.",
  };
};

/**
 * Đặt lại mật khẩu (sau khi đã xác thực OTP)
 */
export const resetPassword = async (
  resetToken,
  newPassword,
  ipAddress,
  userAgent,
) => {
  // Hash token nhận được từ client
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const tokenRecord = await ResetToken.findOne({
    token: hashedToken,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenRecord) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Token không hợp lệ hoặc đã hết hạn.",
    );
  }

  const user = await User.findById(tokenRecord.userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy người dùng.");
  }

  // Cập nhật mật khẩu mới
  user.password = newPassword; // sẽ được hash qua middleware pre('save')
  user.requiresPasswordChange = false;
  await user.save();

  // Đánh dấu token đã dùng
  tokenRecord.used = true;
  await tokenRecord.save();

  // Xóa tất cả OTP password_reset cũ của user (phòng trường hợp còn sót)
  await Otp.deleteMany({ email: user.email, purpose: "password_reset" });

  // Audit log
  await AuditLog.create({
    userId: user._id,
    action: "PASSWORD_RESET",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email: user.email, step: "reset_password" },
  });

  logger.info(`Password reset successfully for ${user.email}`);

  return {
    message: "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.",
  };
};

export const login = async (email, password, ipAddress, userAgent) => {
  // 1. Tìm user (bao gồm cả password để so sánh)
  const user = await User.findOne({ email }).select(
    "+password +loginAttempts +lockUntil +status +emailVerified +requiresPasswordChange +deactivatedAt",
  );
  if (!user) {
    // Ghi log thất bại (email không tồn tại)
    await AuditLog.create({
      action: "LOGIN",
      status: "FAILURE",
      ipAddress,
      userAgent,
      details: { email, reason: "Email không tồn tại" },
    });
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Email hoặc mật khẩu không chính xác.",
    );
  }

  if (user.requiresPasswordChange) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Để đảm bảo bảo mật, bạn bắt buộc phải thiết lập lại mật khẩu trước khi đăng nhập lần đầu tiên. Vui lòng sử dụng tính năng 'Quên mật khẩu'.",
    );
  }

  // 2. Kiểm tra trạng thái tài khoản
  if (user.status === "banned") {
    const reason = user.bannedReason || "không rõ lý do";
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Tài khoản đã bị khóa. Lý do: ${reason}. Vui lòng liên hệ quản trị viên.`,
    );
  }

  // Sửa lỗi: Chặn triệt để user đã bị Admin xóa mềm (Soft Delete)
  if (user.status === "inactive" && user.deactivatedAt) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.",
    );
  }

  // User mới đăng ký chưa xác thực email (status cũng là inactive nhưng không có deactivatedAt)
  if (!user.emailVerified) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản chưa được xác thực email. Vui lòng kiểm tra email hoặc yêu cầu gửi lại mã xác thực.",
    );
  }

  // 3. Kiểm tra tài khoản có bị khóa tạm thời không
  if (user.isLocked()) {
    const lockTimeRemaining = Math.ceil(
      (user.lockUntil - Date.now()) / (60 * 1000),
    ); // phút
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Tài khoản tạm thời bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${lockTimeRemaining} phút.`,
    );
  }

  // 4. Kiểm tra mật khẩu
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    // Tăng số lần thử sai
    await user.incrementLoginAttempts();

    await AuditLog.create({
      userId: user._id,
      action: "LOGIN",
      status: "FAILURE",
      ipAddress,
      userAgent,
      details: {
        email,
        reason: "Sai mật khẩu",
        loginAttempts: user.loginAttempts + 1,
      },
    });

    // Thông báo lỗi chung
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Email hoặc mật khẩu không chính xác.",
    );
  }

  // 5. Đăng nhập thành công: reset số lần thử sai và cập nhật lastLogin
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  // 6. Tạo tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken();

  // Lưu refresh token vào DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Sửa lỗi: Băm token bằng SHA-256 trước khi lưu để chống lộ lọt dữ liệu
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await RefreshToken.create({
    token: hashedRefreshToken,
    user: user._id,
    expiresAt,
    revoked: false,
  });

  // 7. Audit log
  await AuditLog.create({
    userId: user._id,
    action: "LOGIN",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email },
  });

  logger.info(`User logged in: ${email}`);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

// ==================== REFRESH TOKEN ====================

export const refreshAccessToken = async (
  refreshToken,
  ipAddress,
  userAgent,
) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken); // ✅ Gán decoded
  } catch (error) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Refresh token không hợp lệ hoặc đã hết hạn.",
    );
  }

  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const tokenDoc = await RefreshToken.findOne({
    token: hashedRefreshToken,
    revoked: false,
  });

  if (
    !tokenDoc ||
    (decoded?.id && tokenDoc.user.toString() !== decoded.id.toString())
  ) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Refresh token không tồn tại hoặc đã bị thu hồi.",
    );
  }

  // 3. Kiểm tra hết hạn
  if (tokenDoc.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token đã hết hạn.");
  }

  // 4. Tìm user
  const user = await User.findById(tokenDoc.user);
  if (!user || user.status === "banned") {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Người dùng không hợp lệ.");
  }

  // 5. Tạo access token mới
  const newAccessToken = generateAccessToken(user._id, user.role);

  // 7. Audit log
  await AuditLog.create({
    userId: user._id,
    action: "REFRESH_TOKEN",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { email: user.email },
  });

  logger.info(`Access token refreshed for ${user.email}`);

  return { accessToken: newAccessToken };
};

// ==================== ĐĂNG XUẤT ====================

export const logout = async (refreshToken, ipAddress, userAgent) => {
  const hashedRefreshToken = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");
  const tokenDoc = await RefreshToken.findOne({ token: hashedRefreshToken });
  if (tokenDoc) {
    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    if (tokenDoc.user) {
      await AuditLog.create({
        userId: tokenDoc.user,
        action: "LOGOUT",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        details: {},
      });
      logger.info(`User logged out: ${tokenDoc.user}`);
    }
  }
  return { message: "Đăng xuất thành công." };
};

/**
 * Đăng xuất tất cả thiết bị (cần xác thực)
 */
export const logoutAll = async (userId, ipAddress, userAgent) => {
  // Xóa tất cả refresh token của user
  const result = await RefreshToken.deleteMany({ user: userId });

  await AuditLog.create({
    userId,
    action: "LOGOUT_ALL",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { deletedCount: result.deletedCount },
  });

  logger.info(`User logged out from all devices: ${userId}`);

  return { message: "Đã đăng xuất khỏi tất cả thiết bị." };
};
