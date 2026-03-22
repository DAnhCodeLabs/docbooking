import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .regex(
        /^(?=.*[A-Z])(?=.*\d)/,
        "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số",
      ),
    confirmPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu"),
    fullName: z.string().min(1, "Họ Tên không được để trống"),
    phone: z
      .string()
      .regex(
        /^(0|\+84)[3-9][0-9]{8}$/,
        "Số điện thoại không đúng định dạng Việt Nam",
      )
      .optional()
      .nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

// Schema cho quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

// Schema cho đặt lại mật khẩu
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .regex(
        /^(?=.*[A-Z])(?=.*\d)/,
        "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số",
      ),
    confirmPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

// Schema cho OTP (dùng cho cả verify-email và reset-password)
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Mã OTP phải có 6 ký tự")
    .regex(/^\d+$/, "Mã OTP chỉ được chứa số"),
});
