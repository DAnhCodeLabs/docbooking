import { useAuthStore } from "@/stores/authStore";
import { Navigate } from "react-router-dom";

const AuthGuard = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    // Nếu đã đăng nhập, chuyển hướng về trang tương ứng với role
    if (user?.role === "patient") {
      return <Navigate to="/home" replace />;
    } else if (user?.role === "clinic_admin") {
      return <Navigate to="/clinic_admin/clinic-dashboard" replace />;
    } else {
      // admin hoặc doctor
      return (
        <Navigate
          to={user.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard"}
          replace
        />
      );
    }
  }

  return children;
};

export default AuthGuard;
