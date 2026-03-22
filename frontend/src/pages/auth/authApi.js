import { httpPost } from "@/services/http";

export const authApi = {
  // Đăng ký
  register: (data) => httpPost("/auth/register", data),

  // Đăng nhập
  login: (email, password) =>
    httpPost("/auth/login", { email, password }, false),

  // Xác thực email - Loại bỏ duplicate
  verifyEmail: (email, otp) => httpPost("/auth/verify-email", { email, otp }),

  // Gửi lại OTP - Loại bỏ duplicate
  resendOtp: (email) => httpPost("/auth/resend-otp", { email }),

  // Xác thực OTP quên mật khẩu
  verifyResetOtp: (email, otp) =>
    httpPost("/auth/verify-reset-otp", { email, otp }),

  // Quên mật khẩu (gửi OTP)
  forgotPassword: (email) => httpPost("/auth/forgot-password", { email }),

  // Đặt lại mật khẩu - Loại bỏ duplicate
  resetPassword: (token, password) =>
    httpPost("/auth/reset-password", { token, password }),

  // Refresh token
  refreshToken: () => httpPost("/auth/refresh-token", {}),

  // Đăng xuất
  logout: () => httpPost("/auth/logout", {}),
};
