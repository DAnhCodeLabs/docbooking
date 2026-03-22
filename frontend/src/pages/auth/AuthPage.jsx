import { useAuthStore } from "@/stores/authStore";
import { message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "./authApi";
import AuthLayout from "./components/AuthLayout";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";

const AuthPage = ({ initialMode = "login" }) => {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (data) => {
    setLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);
      const { accessToken, user } = response;

      // Kiểm tra role: chỉ patient được đăng nhập ở đây
      if (user.role !== "patient") {
        message.error(
          "Tài khoản không phải bệnh nhân. Vui lòng sử dụng cổng đăng nhập dành cho Admin/Doctor.",
        );
        return; // Dừng lại, không setAuth và không chuyển trang
      }

      setAuth(user, accessToken);
      message.success("Đăng nhập thành công!");
      navigate("/home");
    } catch (error) {
      console.error("Login error:", error);
      // Lỗi đã được interceptor hiển thị, không cần xử lý thêm
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data) => {
    setLoading(true);
    try {
      await authApi.register(data);
      navigate("/auth/verify-email", {
        state: {
          email: data.email,
          password: data.password,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  return (
    <AuthLayout>
      <div className="transition-all duration-500 ease-in-out">
        {mode === "login" ? (
          <LoginForm onSubmit={handleLogin} loading={loading} />
        ) : (
          <RegisterForm onSubmit={handleRegister} loading={loading} />
        )}
      </div>

      <div className="mt-2 pt-6">
        <p className="text-slate-500 text-sm font-medium">
          {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <button
            type="button"
            onClick={toggleMode}
            className="text-blue-600 font-semibold hover:text-blue-800 transition-colors p-0 bg-transparent border-none cursor-pointer"
          >
            {mode === "login" ? "Tạo tài khoản mới" : "Đăng nhập ngay"}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default AuthPage;
