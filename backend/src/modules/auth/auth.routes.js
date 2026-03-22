import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as authController from "./auth.controller.js";
import * as authValidation from "./auth.validation.js";

const router = express.Router();

// Rate limit riêng cho đăng ký (5 lần/giờ)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  message: "Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit cho gửi lại OTP (3 lần/giờ)
const resendOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
});

// Rate limit cho xác thực email (5 lần/giờ)
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Bạn đã xác thực quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
});

// Rate limit cho forgot password (3 lần/giờ)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message:
    "Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
});

// Rate limit cho reset password (5 lần/giờ)
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Bạn đã đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
});

// Rate limit cho đăng nhập (5 lần/15 phút)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    statusCode: 429,
    message:
      "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  },
});

// Route đăng ký
router.post(
  "/register",
  registerLimiter,
  validate(authValidation.registerSchema),
  authController.register,
);

// Route đăng nhập
router.post(
  "/login",
  loginLimiter,
  validate(authValidation.loginSchema),
  authController.login,
);

// Route refresh token
router.post("/refresh-token", authController.refreshToken);

// Route đăng xuất (chỉ cần refresh token)
router.post("/logout", authController.logout);

// Route đăng xuất tất cả (cần access token)
router.post("/logout-all", protect, authController.logoutAll);

// Route xác thực OTP
router.post(
  "/verify-email",
  verifyEmailLimiter,
  validate(authValidation.verifyOtpSchema),
  authController.verifyEmail,
);

// Route gửi lại OTP
router.post(
  "/resend-otp",
  resendOtpLimiter,
  validate(authValidation.resendOtpSchema),
  authController.resendOtp,
);

router.post(
  "/verify-reset-otp",
  resendOtpLimiter,
  validate(authValidation.verifyOtpSchema),
  authController.verifyResetOtp,
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(authValidation.forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  validate(authValidation.resetPasswordSchema),
  authController.resetPassword,
);

export default router;
