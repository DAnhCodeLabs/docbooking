import { useAuthStore } from "@/stores/authStore";
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";

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
    <Dropdown
      menu={{ items }}
      placement="bottomRight"
      arrow
      trigger={["click"]}
    >
      <Space className="cursor-pointer! transition-all! duration-300! hover:bg-slate-50! p-1.5! md:p-2! rounded-xl!">
        <Avatar
          size="large"
          className="bg-blue-600! border-2! border-white! shadow-sm!"
          icon={<UserOutlined />}
          src={user?.avatar}
        />
        <div className="hidden md:flex flex-col leading-tight ml-1 justify-center">
          <Text className="text-slate-800! font-semibold! text-[14px]! m-0!">
            {user?.fullName || "Quản trị viên"}
          </Text>
          <Text className="text-slate-400! text-[11px]! uppercase! tracking-wider! font-medium! mt-0.5!">
            {user?.role || "ADMIN"}
          </Text>
        </div>
      </Space>
    </Dropdown>
  );
};

export default ProfileMenu;
