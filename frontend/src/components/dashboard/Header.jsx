import Breadcrumb from "@/components/common/Breadcrumb";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Layout } from "antd";
import ProfileMenu from "./ProfileMenu";

const { Header: AntHeader } = Layout;

const Header = ({ collapsed, onToggle, isMobile }) => {
  return (
    <AntHeader className="z-30! bg-white/95! backdrop-blur-md! px-4! md:px-8! flex! items-center! justify-between! border-b! border-slate-200! h-20! leading-[normal]! sticky! top-0!">
      {/* NỬA TRÁI: Nút Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 md:gap-6">
        <Button
          type="text"
          icon={
            collapsed ? (
              <MenuUnfoldOutlined className="text-[18px]!" />
            ) : (
              <MenuFoldOutlined className="text-[18px]!" />
            )
          }
          onClick={onToggle}
          className="text-slate-500! hover:text-blue-600! hover:bg-blue-50! w-10! h-10! flex! items-center! justify-center! rounded-xl! transition-colors! border-0! shadow-none!"
        />

        {/* Ẩn Breadcrumb trên điện thoại, thêm divider dọc tinh tế */}
        {!isMobile && (
          <div className="flex items-center gap-6">
            <div className="w-px h-6 bg-slate-200"></div>
            <Breadcrumb />
          </div>
        )}
      </div>

      {/* NỬA PHẢI: Profile */}
      <div className="flex items-center">
        <ProfileMenu />
      </div>
    </AntHeader>
  );
};

export default Header;
