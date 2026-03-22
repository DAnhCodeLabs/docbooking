import { useAuthStore } from "@/stores/authStore";
import { otpSchema } from "@/utils/validations/authSchemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "./authApi";

const { Title, Text } = Typography;

const OtpPage = ({ purpose = "verify-email" }) => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;
  const password = location.state?.password;
  useEffect(() => {
    if (!email) {
      message.error("Không tìm thấy email. Vui lòng thử lại.");
      navigate(-1);
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0 && !canResend) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, canResend]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (purpose === "verify-email") {
        await authApi.verifyEmail(email, data.otp);
        if (password) {
          try {
            const loginResponse = await authApi.login(email, password);
            const { accessToken, user } = loginResponse;
            setAuth(user, accessToken);
            // Điều hướng theo role
            if (user.role === "patient") navigate("/home");
            else if (user.role === "doctor")
              navigate("/dashboard/doctor/schedule");
            else if (user.role === "admin")
              navigate("/dashboard/admin/doctors");
            else navigate("/");
          } catch (loginError) {
            console.error("Auto login failed:", loginError);
            message.error(
              "Đăng nhập tự động thất bại. Vui lòng đăng nhập thủ công.",
            );
            navigate("/auth/login");
          }
        } else {
          // Không có password (trường hợp lỗi), chuyển về login
          navigate("/auth/login");
        }
      } else {
        const response = await authApi.verifyResetOtp(email, data.otp);
        navigate("/auth/reset-password/new", {
          state: { email, resetToken: response.resetToken },
        });
      }
    } catch (error) {
      console.error("OTP error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    try {
      if (purpose === "verify-email") {
        await authService.resendOtp(email);
        message.success("Mã OTP mới đã được gửi đến email của bạn.");
      } else {
        await authService.forgotPassword(email);
        message.success("Mã OTP mới đã được gửi đến email của bạn.");
      }
    } catch (error) {
      console.error("Resend error:", error);
      setCanResend(true);
    }
  };

  const handleOtpChange = (value) => {
    setValue("otp", value, { shouldValidate: true });
    if (value.length === 6) {
      handleSubmit(onSubmit)();
    }
  };

  const getTitle = () => {
    return purpose === "verify-email" ? "Xác thực email" : "Xác thực OTP";
  };

  const getDescription = () => {
    if (purpose === "verify-email") {
      return `Chúng tôi đã gửi mã xác thực đến email ${email}. Vui lòng nhập mã để hoàn tất đăng ký.`;
    }
    return `Chúng tôi đã gửi mã xác thực đến email ${email}. Vui lòng nhập mã để đặt lại mật khẩu.`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <div className="text-center mb-6">
          <Title level={2}>{getTitle()}</Title>
          <Text type="secondary">{getDescription()}</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} size="large">
          <Form.Item
            label="Mã xác thực"
            validateStatus={errors.otp ? "error" : ""}
            help={errors.otp?.message}
          >
            <Controller
              name="otp"
              control={control}
              render={({ field }) => (
                <Input.OTP
                  {...field}
                  length={6}
                  onChange={(value) => {
                    field.onChange(value);
                    handleOtpChange(value);
                  }}
                />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Xác thực
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center">
          <Text type="secondary">Không nhận được mã? </Text>
          {canResend ? (
            <Button type="link" onClick={handleResend} className="p-0">
              Gửi lại
            </Button>
          ) : (
            <Text type="secondary">Gửi lại sau {countdown}s</Text>
          )}
        </div>

        <div className="text-center mt-4">
          <Button type="link" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OtpPage;
