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
    <Layout className="h-screen overflow-hidden bg-gray-200!">
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
      <Layout className="h-screen overflow-hidden">
        <Header
          collapsed={isMobile ? !mobileOpen : collapsed}
          onToggle={() =>
            isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)
          }
          isMobile={isMobile}
        />

        {/* Nội dung cuộn được */}
        <Layout.Content className="p-4 md:p-8 pt-6 w-full mx-auto bg-white/70 overflow-auto">
          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </Layout.Content>

        <Layout.Footer className="bg-blue-500! text-center text-slate-500 text-sm py-4!">
          Hệ thống Quản trị DocGo © {new Date().getFullYear()}. Đã đăng ký bản
          quyền.
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
