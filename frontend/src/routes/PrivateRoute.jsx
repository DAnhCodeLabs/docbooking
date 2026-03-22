import { useAuthStore } from "@/stores/authStore";
import { Navigate, useLocation } from "react-router-dom";

const PrivateRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // [FIX LỖI CHUYỂN TRANG]: Kiểm tra xem route này dành cho ai
    // Nếu mảng allowedRoles KHÔNG chứa "patient" -> Đây là khu vực của nội bộ (admin/doctor/clinic_admin)
    if (allowedRoles && !allowedRoles.includes("patient")) {
      return <Navigate to="/staff/login" state={{ from: location }} replace />;
    }

    // Mặc định cho các trường hợp khác (hoặc bệnh nhân) thì về trang login chung
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Nếu đã đăng nhập nhưng không có quyền truy cập route này
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === "patient") {
      return <Navigate to="/home" replace />;
    } else if (user?.role === "doctor") {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (user?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user?.role === "clinic_admin") {
      return <Navigate to="/clinic_admin/dashboard" replace />;
    } else {
      return <Navigate to="/auth/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
