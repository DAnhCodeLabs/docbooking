import { z } from "zod";

// Schema đăng ký
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .email({ message: "Email không hợp lệ" })
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: "Mật khẩu là bắt buộc" })
      .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
      .regex(/^(?=.*[A-Z])(?=.*\d)/, {
        message: "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số",
      }),
    fullName: z
      .string({ required_error: "Họ Tên là bắt buộc" })
      .min(1, "Tên không được để trống")
      .trim(),
    gender: z.enum(["male", "female", "other"]).optional().nullable(),
    phone: z
      .string()
      .regex(
        /^(0|\+84)[3-9][0-9]{8}$/,
        "Số điện thoại không đúng định dạng Việt Nam",
      )
      .optional()
      .nullable(),
  }),
});

// Schema xác thực OTP (chung cho cả đăng ký và quên mật khẩu)
export const verifyOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .email("Email không hợp lệ")
      .toLowerCase()
      .trim(),
    otp: z
      .string({ required_error: "Mã OTP là bắt buộc" })
      .length(6, "Mã OTP phải có 6 ký tự")
      .regex(/^\d+$/, "Mã OTP chỉ được chứa số"),
  }),
});

// Schema gửi lại OTP (chung)
export const resendOtpSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .email("Email không hợp lệ")
      .toLowerCase()
      .trim(),
  }),
});

// Schema quên mật khẩu (gửi OTP)
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .email("Email không hợp lệ")
      .toLowerCase()
      .trim(),
  }),
});

// Schema xác thực OTP cho quên mật khẩu (dùng chung verifyOtpSchema, nhưng có thể thêm trường purpose nếu muốn)

// Schema đặt lại mật khẩu (sau khi xác thực OTP thành công)
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string({ required_error: "Token là bắt buộc" }),
    password: z
      .string({ required_error: "Mật khẩu mới là bắt buộc" })
      .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
      .regex(/^(?=.*[A-Z])(?=.*\d)/, {
        message: "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số",
      }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email là bắt buộc" })
      .email("Email không hợp lệ")
      .toLowerCase()
      .trim(),
    password: z.string({ required_error: "Mật khẩu là bắt buộc" }),
  }),
});

// Schema refresh token
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: "Refresh token là bắt buộc" }),
  }),
});

// Schema logout (có thể chỉ cần refreshToken)
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: "Refresh token là bắt buộc" }),
  }),
});
