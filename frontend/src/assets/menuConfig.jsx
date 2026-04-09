import {
  ApartmentOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  IdcardOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";

// ==========================================
// MENU DÀNH CHO ADMIN
// ==========================================
export const adminMenu = [
  {
    key: "/admin/dashboard", // Sửa từ / hoặc /dashboard/home
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "/admin/users",
    icon: <UserOutlined />,
    label: "Quản lý người dùng",
  },
  {
    key: "/admin/specialties",
    icon: <ApartmentOutlined />,
    label: "Quản lý danh mục chuyên khoa",
  },
  {
    key: "/admin/pending-doctors", // Sửa từ /dashboard/admin/pending-doctors
    icon: <CheckCircleOutlined />,
    label: "Duyệt hồ sơ bác sĩ",
  },
  {
    key: "/admin/clinic-leads", // thêm route mới
    icon: <ShopOutlined />,
    label: "Quản lý phòng khám",
  },
  {
    key: "/admin/appointments",
    icon: <ScheduleOutlined />,
    label: "Quản lý lịch hẹn",
  },
  {
    key: "/admin/reports", // Sửa từ /dashboard/admin/reports
    icon: <BarChartOutlined />,
    label: "Báo cáo thống kê",
  },
  {
    key: "/admin/settings", // Sửa từ /dashboard/admin/settings
    icon: <SettingOutlined />,
    label: "Cài đặt hệ thống",
  },
];

// ==========================================
// MENU DÀNH CHO DOCTOR
// ==========================================
export const doctorMenu = [
  {
    key: "/doctor/dashboard", // Sửa từ /dashboard/home
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "/doctor/schedule", // Sửa từ /dashboard/doctor/schedule
    icon: <CalendarOutlined />,
    label: "Lịch làm việc",
  },
  {
    key: "/doctor/leave",
    icon: <CalendarOutlined />, // hoặc dùng icon khác
    label: "Quản lý ngày nghỉ",
  },
  {
    key: "/doctor/appointments", // Sửa từ /dashboard/doctor/appointments
    icon: <ScheduleOutlined />,
    label: "Lịch hẹn",
  },
  {
    key: "/doctor/patients", // Sửa từ /dashboard/doctor/patients
    icon: <UserOutlined />,
    label: "Bệnh nhân của tôi",
  },
  {
    key: "/doctor/profile", // Sửa từ /dashboard/doctor/profile
    icon: <IdcardOutlined />,
    label: "Hồ sơ cá nhân",
  },
];

export const clinicMenu = [
  {
    key: "/clinic_admin/clinic-dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },

  {
    key: "/clinic_admin/doctors",
    icon: <CheckCircleOutlined />,
    label: "Quản lý bác sĩ",
  },
  {
    key: "/clinic_admin/appointments",
    icon: <ScheduleOutlined />,
    label: "Quản lý lịch hẹn",
  },
];
