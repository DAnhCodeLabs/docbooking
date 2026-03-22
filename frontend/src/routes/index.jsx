import Categories from "@/pages/admin/ManageCategories/Categories";
import ClinicLeads from "@/pages/admin/ManageClinicLeads/ClinicLeads";
import ClinicDoctorsPage from "@/pages/clinic/ManageClinicDoctors/ClinicDoctorsPage";
import LeavePage from "@/pages/doctor/ManageLeave/LeavePage";
import ProfilePage from "@/pages/doctor/ManageProfile/ProfilePage";
import BookingPage from "@/pages/patient/BookingPage/BookingPage";
import DoctorsPage from "@/pages/patient/DoctorsPage";
import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import AuthGuard from "./AuthGuard";
import PrivateRoute from "./PrivateRoute";

// Layouts
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const PatientLayout = lazy(() => import("@/layouts/PatientLayout"));

// Admin pages
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers/ManageUsers"));
const ManagePendingDoctors = lazy(
  () => import("@/pages/admin/ManagePendingDoctors/ManagePendingDoctors"),
);

// Auth pages
const AuthPage = lazy(() => import("@/pages/auth/AuthPage"));
const ForgotPasswordPage = lazy(
  () => import("@/pages/auth/ForgotPasswordPage"),
);
const OtpPage = lazy(() => import("@/pages/auth/OtpPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const StaffLoginPage = lazy(() => import("@/pages/auth/StaffLoginPage"));

// Doctor pages
const DoctorRegisterPage = lazy(
  () => import("@/pages/doctor/ClinicDoctorRegister/DoctorRegisterPage"),
);
const SchedulePage = lazy(
  () => import("@/pages/doctor/ManageSchedule/SchedulePage"),
);
const MyPatients = lazy(() => import("@/pages/doctor/MyPatients"));

// Patient pages
const HomePage = lazy(() => import("@/pages/patient/HomePage"));

// Dashboard common pages
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const Profile = lazy(() => import("@/pages/dashboard/Profile"));

// Other
const NotFound = lazy(() => import("@/pages/NotFound"));
export const router = createBrowserRouter([
  // Auth routes (chỉ cho phép khi chưa đăng nhập)
  {
    path: "/auth",
    element: (
      <AuthGuard>
        <Outlet />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: "login", element: <AuthPage initialMode="login" /> },
      { path: "register", element: <AuthPage initialMode="register" /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "verify-email", element: <OtpPage purpose="verify-email" /> },
      {
        path: "reset-password/otp",
        element: <OtpPage purpose="reset-password" />,
      },
      { path: "reset-password/new", element: <ResetPasswordPage /> },
    ],
  },

  // Staff login (chỉ cho phép khi chưa đăng nhập)
  {
    path: "/staff/login",
    element: (
      <AuthGuard>
        <StaffLoginPage />
      </AuthGuard>
    ),
  },

  // Patient routes
  {
    path: "/",
    element: <PatientLayout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: "home", element: <HomePage /> },
      {
        path: "/become-doctor",
        element: <DoctorRegisterPage />,
      },
      {
        path: "doctors",
        element: <DoctorsPage />,
      },
      {
        path: "booking/:doctorId", // THÊM ROUTE ĐẶT LỊCH
        element: (
          <PrivateRoute allowedRoles={["patient"]}>
            <BookingPage />
          </PrivateRoute>
        ),
      },
    ],
  },

  // Dashboard routes (admin & doctor)
  {
    // Layout tổng cho khu vực quản trị (Admin & Doctor)
    path: "/",
    element: <DashboardLayout />,
    children: [
      // 1. Nếu truy cập thẳng vào gốc, có thể đặt 1 redirect an toàn.
      // (Lưu ý: Thường AuthGuard của bạn đã xử lý việc đẩy về đúng trang theo role rồi)
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // ==========================================
      // KHU VỰC DÀNH RIÊNG CHO ADMIN
      // ==========================================
      {
        path: "admin",
        element: (
          <PrivateRoute allowedRoles={["admin"]}>
            <Outlet />
          </PrivateRoute>
        ),
        children: [
          // Mặc định khi vào /admin sẽ trỏ tới /admin/dashboard
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },

          // Các trang dùng chung nhưng mang namespace của admin
          { path: "dashboard", element: <DashboardHome /> },
          { path: "profile", element: <Profile /> },

          // Các trang nghiệp vụ riêng của admin
          { path: "users", element: <ManageUsers /> },
          {
            path: "pending-doctors",
            element: <ManagePendingDoctors />,
          },
          {
            path: "clinic-leads",
            element: <ClinicLeads />,
          },
          {
            path: "specialties",
            element: <Categories />,
          },
        ],
      },

      // ==========================================
      // KHU VỰC DÀNH RIÊNG CHO DOCTOR
      // ==========================================
      {
        path: "doctor",
        element: (
          <PrivateRoute allowedRoles={["doctor"]}>
            <Outlet />
          </PrivateRoute>
        ),
        children: [
          // Mặc định khi vào /doctor sẽ trỏ tới /doctor/dashboard
          { index: true, element: <Navigate to="/doctor/dashboard" replace /> },

          // Các trang dùng chung nhưng mang namespace của doctor
          { path: "dashboard", element: <DashboardHome /> },

          // Các trang nghiệp vụ riêng của doctor
          { path: "schedule", element: <SchedulePage /> },
          {
            path: "leave",
            element: <LeavePage />,
          },
          { path: "patients", element: <MyPatients /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },

      {
        path: "clinic_admin",
        element: (
          <PrivateRoute allowedRoles={["clinic_admin"]}>
            <Outlet />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/clinic_admin/dashboard" replace />,
          },
          { path: "dashboard", element: <DashboardHome /> },
          { path: "profile", element: <Profile /> },
          {
            path: "doctors",
            element: <ClinicDoctorsPage />,
          },
        ],
      },
    ],
  },

  // 404
  {
    path: "*",
    element: <NotFound />,
  },
]);
