import Breadcrumb from "@/components/common/Breadcrumb";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Layout } from "antd";
import ProfileMenu from "./ProfileMenu";

const { Header: AntHeader } = Layout;

const Header = ({ collapsed, onToggle, isMobile }) => {
  return (
    <AntHeader className="z-30 bg-white! px-4 md:px-6 flex items-center justify-between shadow-sm border-b border-slate-100 h-20 transition-all">
      {/* NỬA TRÁI: Nút Toggle & Breadcrumb */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          type="text"
          icon={
            collapsed ? (
              <MenuUnfoldOutlined className="text-xl" />
            ) : (
              <MenuFoldOutlined className="text-xl" />
            )
          }
          onClick={onToggle}
          className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 w-10 h-10 flex items-center justify-center rounded-lg transition-all"
        />

        {/* Ẩn Breadcrumb trên điện thoại */}
        {!isMobile && (
          <div className="ml-2">
            <Breadcrumb />
          </div>
        )}
      </div>

      {/* NỬA PHẢI: Profile */}
      <div className="flex items-center gap-1 md:gap-3">
        <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>
        <ProfileMenu />
      </div>
    </AntHeader>
  );
};

export default Header;
