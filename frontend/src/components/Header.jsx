import { specialtyService } from "@/pages/admin/ManageCategories/specialtyService";
import { useAuthStore } from "@/stores/authStore";
import {
  DownOutlined,
  FacebookOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuOutlined,
  TikTokOutlined,
  UserOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Input, Menu } from "antd";
import { useEffect, useState } from "react";
import { IoSearch } from "react-icons/io5";
import { SlEarphonesAlt } from "react-icons/sl";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const navigate = useNavigate();

  // State chứa danh sách dịch vụ
  const [specialties, setSpecialties] = useState([]);
  const { isAuthenticated, user, logout } = useAuthStore();

  // Hiệu ứng cuộn trang
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Gọi API lấy danh mục dịch vụ khi Header vừa render
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await specialtyService.getSpecialties({
          status: "active",
          limit: 12, // Lấy 12 dịch vụ nổi bật để đưa lên Mega Menu
        });
        setSpecialties(res.specialties || []);
      } catch (error) {
        console.error("Lỗi tải danh mục dịch vụ Header:", error);
      }
    };
    fetchServices();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/home");
  };

  const handleMobileMenuClick = (e) => {
    setOpenMobileMenu(false);
    if (e.key === "logout") {
      handleLogout();
    } else if (e.key === "login") {
      navigate("/auth");
    } else if (e.key === "doctor-register") {
      navigate("/become-doctor");
    } else if (e.key.startsWith("service-")) {
      const serviceId = e.key.replace("service-", "");
      navigate(`/services/${serviceId}`);
    } else {
      navigate(`/${e.key}`);
    }
  };

  // =========================================================
  // MEGA MENU CHO DESKTOP (Giao diện hiển thị thả xuống)
  // =========================================================
  const ServiceMegaMenu = () => (
    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-162.5 lg:w-212.5 cursor-default animate-fade-in-up">
      <div className="flex items-center justify-between mb-5 px-2 border-b border-slate-100 pb-3">
        <h3 className="text-slate-800 text-lg font-bold m-0">
          Danh mục Chuyên khoa & Dịch vụ
        </h3>
        <Button type="link" className="text-blue-600! font-semibold! p-0!">
          Xem tất cả
        </Button>
      </div>

      {specialties.length === 0 ? (
        <div className="text-slate-500 p-2 text-center py-8">
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          {specialties.map((spec) => (
            <div
              key={spec._id}
              onClick={() => {
                navigate(`/services/${spec._id}`);
                // Bạn có thể thêm logic đóng menu ở đây nếu cần
              }}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-blue-100"
            >
              <Avatar
                src={spec.image}
                icon={
                  !spec.image && <MedicineBoxOutlined className="text-xl!" />
                }
                shape="square"
                size={44}
                className="bg-blue-100! text-blue-600!  shrink-0! shadow-sm!"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1 mb-0.5">
                  {spec.name}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 leading-snug group-hover:text-blue-600/80">
                  {spec.description ||
                    "Tư vấn và khám chữa bệnh chuyên sâu bởi đội ngũ bác sĩ hàng đầu."}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =========================================================
  // CẤU HÌNH MENU DESKTOP (Sử dụng Mega Menu)
  // =========================================================
  const desktopNavItems = [
    { label: "Trang chủ", key: "home" },
    { label: <Link to="/doctors">Bác sỹ</Link>, key: "doctors" },
    {
      label: (
        // Gắn Dropdown bọc lấy chữ "Dịch vụ"
        <Dropdown
          dropdownRender={() => <ServiceMegaMenu />}
          trigger={["hover"]}
          placement="bottom"
          arrow={{ pointAtCenter: true }}
        >
          <span className="flex items-center gap-1">
            Dịch vụ <DownOutlined className="text-[10px]" />
          </span>
        </Dropdown>
      ),
      key: "services",
    },
    { label: "Tin tức", key: "news" },
    { label: "Liên hệ", key: "contact" },
  ];

  // =========================================================
  // CẤU HÌNH MENU MOBILE ĐỘNG (Dạng list thả xuống tiêu chuẩn)
  // =========================================================
  const mobileNavItems = [
    { label: "Trang chủ", key: "home" },
    { label: "Bác sỹ", key: "doctors" },
    {
      label: "Dịch vụ",
      key: "services",
      children:
        specialties.length > 0
          ? specialties.map((spec) => ({
              label: spec.name,
              key: `service-${spec._id}`,
            }))
          : [{ label: "Đang tải dữ liệu...", key: "loading", disabled: true }],
    },
    { label: "Tin tức", key: "news" },
    { label: "Liên hệ", key: "contact" },
    { type: "divider" },
    {
      key: "doctor-register",
      label: "Đăng ký làm Bác sĩ",
      icon: <MedicineBoxOutlined />,
      className: "!text-teal-600 !font-bold bg-teal-50/50 rounded-lg mx-2",
    },
    { type: "divider" },
    ...(isAuthenticated
      ? [
          {
            key: "user-info",
            label: `Xin chào, ${user?.fullName || "Bạn"}`,
            disabled: true,
            className: "!text-blue-600 !font-bold",
          },
          {
            label: "Đăng xuất",
            key: "logout",
            icon: <LogoutOutlined />,
            danger: true,
          },
        ]
      : [
          {
            label: "Đăng nhập / Đăng ký",
            key: "login",
            icon: <UserOutlined />,
            className: "text-blue-600 font-semibold",
          },
        ]),
  ];

  const userDropdownItems = [
    {
      key: "appointments",
      label: "Lịch sử khám",
      icon: <UserOutlined />,
      onClick: () => navigate("/appointments"),
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  const getDisplayName = () => {
    if (!user) return "Tài khoản";
    return `${user.lastName || ""} ${user.firstName || ""}`.trim();
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 w-full z-50 bg-white transition-all duration-300 ${isScrolled ? "shadow-md" : "shadow-sm"}`}
      >
        {/* TOPBAR */}
        <div
          className={`w-full border-b border-gray-100 transition-all duration-500 ease-in-out overflow-hidden ${isScrolled ? "max-h-0 opacity-0" : "max-h-20 opacity-100"}`}
        >
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 h-12 flex items-center justify-between">
            <div className="hidden md:flex items-center justify-center font-semibold text-gray-500 text-sm">
              <div className="flex items-center gap-2 pr-4 py-2 cursor-pointer transition-colors hover:text-black">
                <TikTokOutlined /> <span>TikTok</span>
              </div>
              <div className="flex items-center gap-2 px-6 py-2 border-x border-gray-200 cursor-pointer transition-colors hover:text-blue-600">
                <FacebookOutlined /> <span>Facebook</span>
              </div>
              <div className="flex items-center gap-2 pl-4 py-2 cursor-pointer transition-colors hover:text-red-600">
                <YoutubeOutlined /> <span>Youtube</span>
              </div>
            </div>

            <div className="flex items-center justify-end w-full md:w-auto gap-4 lg:gap-8">
              <div className="flex items-center justify-center gap-3">
                <SlEarphonesAlt className="text-2xl text-red-500" />
                <div className="flex flex-col justify-center">
                  <div className="hidden sm:block text-gray-500 text-xs font-medium">
                    Tư vấn/Đặt khám
                  </div>
                  <div className="text-blue-600 text-lg font-bold leading-tight">
                    1900 2115
                  </div>
                </div>
              </div>

              <Button
                type="primary"
                className="bg-teal-600! hover:bg-teal-700! border-none! font-semibold! hidden! md:flex! items-center! shadow-sm! shadow-teal-600/20! transition-all!"
                icon={<MedicineBoxOutlined />}
                onClick={() => navigate("/become-doctor")}
              >
                Trở thành Bác sĩ
              </Button>

              {isAuthenticated ? (
                <Dropdown
                  menu={{ items: userDropdownItems }}
                  placement="bottomRight"
                  arrow
                >
                  <Button
                    type="primary"
                    ghost
                    className="font-semibold! h-9! px-4!  hidden! sm:flex! items-center!"
                    icon={<UserOutlined />}
                  >
                    {getDisplayName()}
                  </Button>
                </Dropdown>
              ) : (
                <Button
                  type="primary"
                  ghost
                  className="font-semibold! h-9! px-4!  hidden! sm:flex! items-center!"
                  icon={<UserOutlined />}
                  onClick={() => navigate("/auth")}
                >
                  Tài khoản
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* MAIN NAVBAR */}
        <div className="w-full transition-all duration-300 h-16 md:h-20">
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-6 lg:gap-10">
              <div
                className="flex items-center gap-2 text-2xl lg:text-3xl font-bold cursor-pointer"
                onClick={() => navigate("/")}
              >
                <div className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                  D
                </div>
                <span className="bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  DocGo
                </span>
              </div>

              <div className="hidden lg:block w-64 xl:w-80">
                <Input
                  placeholder="Tìm bác sĩ, phòng khám..."
                  prefix={<IoSearch className="text-gray-400 text-lg mr-1" />}
                  className="rounded-full! py-2! bg-gray-50! border-gray-200! hover:border-blue-400! focus:border-blue-500! transition-colors!"
                  onPressEnter={(e) => {
                    const keyword = e.target.value.trim();
                    if (keyword) {
                      navigate(
                        `/doctors?search=${encodeURIComponent(keyword)}`,
                      );
                      e.target.value = ""; // optional: clear after search
                    }
                  }}
                />
              </div>
            </div>

            <div className="hidden lg:flex flex-1 justify-end">
              <Menu
                mode="horizontal"
                items={desktopNavItems}
                disabledOverflow
                className="border-none! bg-transparent! text-[15px]! font-semibold! text-gray-700! w-full! flex! justify-end!"
              />
            </div>

            <div className="flex lg:hidden items-center gap-2">
              <Button
                type="text"
                shape="circle"
                icon={<MenuOutlined className="text-xl! text-gray-700!" />}
                onClick={() => setOpenMobileMenu(true)}
                className="bg-gray-50! border-gray-100! flex! items-center! justify-center!"
              />
            </div>
          </div>
        </div>

        {/* Thanh chạy chữ */}
        <div className="w-full h-10 bg-linear-to-r from-blue-600 via-cyan-500 to-blue-600 flex items-center overflow-hidden relative border-t border-blue-400/30">
          <style>
            {`
              @keyframes scroll-text { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .animate-scroll-text { animation: scroll-text 45s linear infinite; }
              .animate-scroll-text:hover { animation-play-state: paused; }
            `}
          </style>
          <div className="flex whitespace-nowrap animate-scroll-text text-white font-semibold text-[13px] md:text-sm tracking-wide cursor-default">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center">
                {[...Array(6)].map((_, j) => (
                  <span key={j} className="flex items-center mx-6">
                    <span className="mr-6 text-yellow-300">✦</span>ĐẶT LỊCH NGAY
                    ĐỂ TRẢI NGHIỆM DỊCH VỤ CHĂM SÓC SỨC KHỎE HÀNG ĐẦU
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white">
              D
            </div>
            <span className="bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              DocGo
            </span>
          </div>
        }
        placement="right"
        width={300}
        onClose={() => setOpenMobileMenu(false)}
        open={openMobileMenu}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          items={mobileNavItems}
          onClick={handleMobileMenuClick}
          className="border-none! text-[15px]! font-medium! pt-2!"
        />
      </Drawer>
    </>
  );
};

export default Header;
