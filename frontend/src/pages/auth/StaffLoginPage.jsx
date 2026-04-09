import { useAuthStore } from "@/stores/authStore";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Col, Form, Input, message, Row, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "./authApi";

const { Title, Text } = Typography;

const StaffLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Lấy hàm setAuth từ Zustand store
  const setAuth = useAuthStore((state) => state.setAuth);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authApi.login(values.email, values.password);
      const { accessToken, user } = response;

      // Kiểm tra phân quyền truy cập
      if (
        user.role !== "admin" &&
        user.role !== "doctor" &&
        user.role !== "clinic_admin"
      ) {
        message.error("Tài khoản không có quyền truy cập khu vực này.");
        return;
      }

      setAuth(user, accessToken);
      message.success("Đăng nhập hệ thống quản trị thành công!");

      // Điều hướng đến dashboard chung
      navigate(
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "doctor"
            ? "/doctor/dashboard"
            : "/clinic_admin/clinic-dashboard",
      );
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="min-h-screen bg-white">
      {/* CỘT TRÁI: KHU VỰC FORM ĐĂNG NHẬP */}
      <Col
        xs={24}
        lg={10}
        xl={9}
        className="flex flex-col justify-center px-6 pt-16 sm:px-12 md:px-20 lg:px-16 bg-white relative z-10 shadow-[20px_0_30px_-15px_rgba(0,0,0,0.05)]"
      >
        <div className="w-full max-w-100 mx-auto animate-fade-in">
          {/* Logo & Branding */}
          <div className="mb-10 flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
              DocGo
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Portal
            </span>
          </div>

          {/* Tiêu đề Form */}
          <div className="mb-8">
            <Title
              level={2}
              className="mb-2! font-bold! text-slate-800! tracking-tight!"
            >
              Cổng nội bộ
            </Title>
            <Text className="text-slate-500 text-base">
              Dành riêng cho Bác sĩ và Quản trị viên hệ thống.
            </Text>
          </div>

          {/* Form Ant Design */}
          <Form
            layout="vertical"
            onFinish={onFinish}
            size="large"
            className="space-y-1"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không đúng định dạng" },
              ]}
              className="mb-5!"
            >
              <Input
                prefix={<MailOutlined className="text-slate-400 mr-2" />}
                placeholder="Nhập địa chỉ email nội bộ"
                className="rounded-xl h-12 bg-slate-50 border-transparent hover:border-blue-400 focus:bg-white focus:border-blue-500 transition-colors"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              className="mb-8!"
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400 mr-2" />}
                placeholder="Nhập mật khẩu"
                className="rounded-xl h-12 bg-slate-50 border-transparent hover:border-blue-400 focus:bg-white focus:border-blue-500 transition-colors"
              />
            </Form.Item>

            <Form.Item className="mb-6!">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="rounded-xl font-semibold h-12 bg-slate-800 hover:bg-slate-900 shadow-md shadow-slate-800/20 border-none transition-all"
              >
                Đăng nhập hệ thống
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Col>

      {/* CỘT PHẢI: HÌNH ẢNH BANNER (Chỉ hiện trên Desktop) */}
      <Col
        xs={0}
        lg={14}
        xl={15}
        className="relative hidden lg:block overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            // Sử dụng hình ảnh bác sĩ/nghiên cứu mang tính chuyên môn, tone màu lạnh
            backgroundImage:
              "url('https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?q=80&w=2070&auto=format&fit=crop')",
          }}
        >
          {/* Overlay Gradient tối màu để tạo sự nghiêm túc, sang trọng */}
          <div className="absolute inset-0 bg-linear-to-br from-slate-900/90 via-slate-800/70 to-blue-900/80 flex flex-col justify-end p-20">
            <div className="max-w-xl animate-fade-in-up">
              <div className="w-16 h-1 bg-blue-500 mb-6 rounded-full"></div>
              <Title
                level={1}
                className="text-white! font-bold! text-4xl! mb-4! tracking-tight!"
              >
                Quản trị hiệu quả, <br /> Nâng tầm dịch vụ.
              </Title>
              <Text className="text-slate-300! text-lg leading-relaxed font-light">
                Hệ thống quản lý thông minh dành cho đội ngũ Y Bác sĩ và Quản
                trị viên. Tối ưu quy trình khám chữa bệnh, bảo mật tuyệt đối dữ
                liệu bệnh nhân.
              </Text>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default StaffLoginPage;
