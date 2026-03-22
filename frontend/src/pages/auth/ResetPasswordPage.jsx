import { LockOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, message, Typography } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "./authApi";

const { Title, Text } = Typography;

const ResetPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { email, resetToken } = location.state || {};

  if (!email || !resetToken) {
    message.error("Thông tin không hợp lệ. Vui lòng thử lại.");
    navigate("/auth/forgot-password");
    return null;
  }

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, values.password);
      navigate("/auth/login");
    } catch (error) {
      console.error("Reset password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <div className="text-center mb-6">
          <Title level={2}>Đặt lại mật khẩu</Title>
          <Text type="secondary">
            Nhập mật khẩu mới cho tài khoản{" "}
            <span className="font-semibold">{email}</span>
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              {
                pattern: /^(?=.*[A-Z])(?=.*\d)/,
                message: "Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 số",
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="••••••"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu không khớp"));
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="••••••"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đặt lại mật khẩu
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Button type="link" onClick={() => navigate("/auth/login")}>
            Quay lại đăng nhập
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
