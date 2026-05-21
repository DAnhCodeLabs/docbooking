import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import { Drawer, Grid, Layout } from "antd";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

const { useBreakpoint } = Grid;

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const screens = useBreakpoint();
  const location = useLocation();

  const isMobile = screens.lg === false;

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <Layout className="h-screen w-screen overflow-hidden bg-gray-200!">
      {/* Sidebar cho desktop */}
      {isMobile ? (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          styles={{ body: { padding: 0 } }}
          width={260}
        >
          <Sidebar collapsed={false} isMobile={true} />
        </Drawer>
      ) : (
        <Sidebar collapsed={collapsed} isMobile={false} />
      )}

      {/* Khu vực chính (Header + Content + Footer) */}
      <Layout className="h-screen flex flex-col overflow-hidden">
        {/* Header - Cố định không bị bóp méo */}
        <div className="shrink-0">
          <Header
            collapsed={isMobile ? !mobileOpen : collapsed}
            onToggle={() =>
              isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)
            }
            isMobile={isMobile}
          />
        </div>

        {/* Content - Khóa cuộn bên ngoài, nhường không gian cho Outlet */}
        <Layout.Content className="flex-1 flex flex-col w-full mx-auto bg-white/70 overflow-hidden relative">
          {/* Vùng chứa Outlet - Chỉ cho phép cuộn nội dung ở thẻ div này */}
          <div className="animate-fade-in-up flex-1 flex flex-col w-full h-full p-4 md:p-8 pt-6 overflow-y-auto custom-scrollbar">
            <Outlet />
          </div>
        </Layout.Content>

        {/* Footer - Cố định dưới cùng */}
        <Layout.Footer className="bg-blue-500! text-center text-slate-500 text-sm py-4! shrink-0 z-10!">
          Hệ thống Quản trị DocGo © {new Date().getFullYear()}. Đã đăng ký bản
          quyền.
        </Layout.Footer>
      </Layout>

      {/* CSS cho thanh cuộn (nếu cần đồng bộ với các trang) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
    </Layout>
  );
};

export default DashboardLayout;
