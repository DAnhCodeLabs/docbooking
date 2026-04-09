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
      className={`h-full! bg-white! ${
        isMobile ? "" : "border-r! border-slate-200! z-20!"
      }`}
    >
      {/* Logo Area */}
      <div
        className="h-20 flex items-center justify-center px-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
        onClick={() =>
          navigate(
            user.role === "admin"
              ? "/admin/dashboard"
              : user.role === "doctor"
                ? "/doctor/dashboard"
                : "/clinic_admin/clinic-dashboard",
          )
        }
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/30">
            D
          </div>
          {!collapsed && (
            <div className="flex flex-col justify-center">
              <span className="text-lg font-bold text-slate-800 leading-tight tracking-tight whitespace-nowrap">
                DocGo Portal
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest leading-tight">
                Enterprise
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Area */}
      <div className="p-3 h-[calc(100%-80px)] overflow-y-auto custom-scrollbar">
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none! bg-transparent!"
        />
      </div>

      {/* Tối ưu hóa UI của Menu theo chuẩn Enterprise SaaS */}
      <style>{`
        .ant-menu-light .ant-menu-item {
          border-radius: 8px !important;
          margin-bottom: 6px !important;
          color: #64748b !important;
          font-weight: 500 !important;
          height: 44px !important;
          line-height: 44px !important;
          transition: all 0.3s ease !important;
        }
        .ant-menu-light .ant-menu-item-selected {
          background-color: #eff6ff !important;
          color: #2563eb !important;
          font-weight: 600 !important;
          position: relative !important;
        }
        /* Tạo đường nhấn màu xanh bên trái cho item đang chọn */
        .ant-menu-light .ant-menu-item-selected::before {
          content: "";
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 20px;
          background-color: #2563eb;
          border-radius: 0 4px 4px 0;
        }
        .ant-menu-light .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background-color: #f1f5f9 !important;
          color: #334155 !important;
        }
        /* Custom scrollbar thanh lịch hơn */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
