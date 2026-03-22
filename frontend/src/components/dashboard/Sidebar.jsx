import { adminMenu, clinicMenu, doctorMenu } from "@/assets/menuConfig";
import { useAuthStore } from "@/stores/authStore";
import { Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

const { Sider } = Layout;

const Sidebar = ({ collapsed, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const menuItems =
    user?.role === "admin"
      ? adminMenu
      : user?.role === "doctor"
        ? doctorMenu
        : clinicMenu;
  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ||
    menuItems[0]?.key;

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={isMobile ? false : collapsed}
      theme="light"
      width={260}
      className={`h-full bg-white ${isMobile ? "" : "border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20"}`}
    >
      {/* Logo */}
      <div
        className="h-20 flex items-center justify-center px-4 border-b border-slate-100 cursor-pointer"
        onClick={() =>
          navigate(
            user.role === "admin"
              ? "/admin/dashboard"
              : user.role === "doctor"
                ? "/doctor/dashboard"
                : "/clinic_admin/dashboard",
          )
        }
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/20">
            D
          </div>
          {!collapsed && (
            <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              DocGo Portal
            </span>
          )}
        </div>
      </div>

      {/* Menu khu vực - chiếm phần còn lại và cuộn nội bộ */}
      <div className="p-3 h-[calc(100%-80px)] overflow-y-auto custom-scrollbar">
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none"
        />
      </div>

      <style>{`
        .ant-menu-light .ant-menu-item {
          border-radius: 8px !important;
          margin-bottom: 4px !important;
          color: #64748b !important;
          font-weight: 500 !important;
        }
        .ant-menu-light .ant-menu-item-selected {
          background-color: #eff6ff !important;
          color: #2563eb !important;
          font-weight: 600 !important;
        }
        .ant-menu-light .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background-color: #f8fafc !important;
          color: #334155 !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
