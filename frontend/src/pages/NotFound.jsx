import { useAuthStore } from "@/stores/authStore";
import { Button, Result } from "antd";
import { Link } from "react-router-dom";

const NotFound = () => {
  const { user, isAuthenticated } = useAuthStore();

  const getHomeLink = () => {
    if (!isAuthenticated) return "/auth/login";
    if (user?.role === "patient") return "/home";
    if (user?.role === "doctor") return "/doctor/dashboard";
    if (user?.role === "admin") return "/admin/dashboard";
    if (user?.role === "clinic_admin") return "/clinic_admin/clinic-dashboard";
    return "/auth/login";
  };

  const getButtonText = () => {
    if (!isAuthenticated) return "Đăng nhập";
    if (user?.role === "patient") return "Về trang chủ";
    if (user?.role === "doctor") return "Trang bác sĩ";
    if (user?.role === "admin") return "Trang quản trị";
    if (user?.role === "clinic_admin") return "Trang quản lý bệnh viện";
    return "Về trang chủ";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-5 p-4">
      <Result
        status="404"
        title="404"
        subTitle="Xin lỗi, trang bạn tìm kiếm không tồn tại."
        extra={
          <Link to={getHomeLink()}>
            <Button type="primary" size="large">
              {getButtonText()}
            </Button>
          </Link>
        }
        className="p-8 max-w-lg w-full"
      />
    </div>
  );
};

export default NotFound;
