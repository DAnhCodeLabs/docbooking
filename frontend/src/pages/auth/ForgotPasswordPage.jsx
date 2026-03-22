import { MailOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "./authApi";

const { Title, Text } = Typography;

const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(values.email);
      navigate("/auth/reset-password/otp", { state: { email: values.email } });
    } catch (error) {
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <div className="text-center mb-6">
          <Title level={2}>Quên mật khẩu</Title>
          <Text type="secondary">
            Nhập email của bạn, chúng tôi sẽ gửi mã xác thực để đặt lại mật
            khẩu.
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="example@email.com"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Gửi mã xác thực
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

export default ForgotPasswordPage;
