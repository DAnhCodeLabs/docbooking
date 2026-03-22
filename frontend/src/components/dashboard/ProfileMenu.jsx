import { Dropdown, Avatar, Space, Typography } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const { Text } = Typography;

const ProfileMenu = () => {
  const navigate = useNavigate();
  // Lấy dữ liệu user và hàm logout từ Zustand
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout(); // Clear state và localStorage
    navigate("/staff/login");
  };

  const items = [
    {
      key: "profile",
      label: "Hồ sơ cá nhân",
      icon: <UserOutlined />,
      onClick: () => navigate("/dashboard/profile"),
    },
    {
      key: "settings",
      label: "Cài đặt hệ thống",
      icon: <SettingOutlined />,
      onClick: () => navigate("/dashboard/settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow trigger={['click']}>
      <Space className="cursor-pointer transition-all duration-300">
        <Avatar
          className="bg-blue-600"
          icon={<UserOutlined />}
          src={user?.avatar} // Sẽ ưu tiên hiển thị ảnh nếu user có ảnh avatar
        />
        <div className="hidden md:flex flex-col leading-tight ml-1">
          <Text className="text-slate-800! font-semibold text-[13px]">
            {user?.fullName || "Quản trị viên"}
          </Text>
          <Text className="text-slate-400 text-[11px] uppercase tracking-wider font-medium">
            {user?.role || "ADMIN"}
          </Text>
        </div>
      </Space>
    </Dropdown>
  );
};

export default ProfileMenu;