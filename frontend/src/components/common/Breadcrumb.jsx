import { useAuthStore } from "@/stores/authStore";
import { Breadcrumb as AntBreadcrumb } from "antd";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Map path sang tên tiếng Việt
const pathMap = {
  dashboard: "Dashboard",
  admin: "Quản trị",
  doctors: "Quản lý bác sĩ",
  patients: "Quản lý bệnh nhân",
  specialties: "Chuyên khoa",
  "pending-doctors": "Duyệt hồ sơ",
  reports: "Báo cáo",
  settings: "Cài đặt",
  doctor: "Bác sĩ",
  schedule: "Lịch làm việc",
  appointments: "Lịch hẹn",
  profile: "Hồ sơ",
  home: "Trang chủ",
  users: "Quản lý người dùng",
  clinic_admin: "Quản trị",
};

const Breadcrumb = () => {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const pathSnippets = location.pathname.split("/").filter((i) => i);
    const breadcrumbItems = pathSnippets.map((_, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join("/")}`;
      const label = pathMap[pathSnippets[index]] || pathSnippets[index];
      return {
        key: url,
        title: <Link to={url}>{label}</Link>,
      };
    });

    let homeLink = "/";
    if (user?.role === "admin") {
      homeLink = "/admin/dashboard";
    } else if (user?.role === "doctor") {
      homeLink = "/doctor/dashboard";
    } else if (user?.role === "clinic_admin") {
      homeLink = "/clinic_admin/clinic-dashboard";
    } else {
      homeLink = "/home";
    }

    setItems([
      {
        title: <Link to={homeLink}>Trang chủ</Link>,
      },
      ...breadcrumbItems,
    ]);
  }, [location, user]);

  return <AntBreadcrumb items={items} />;
};

export default Breadcrumb;
