import {
  FacebookFilled,
  TikTokFilled,
  YoutubeFilled,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom"; // Giả định bạn dùng react-router-dom

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t-4 border-blue-600">
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8">
        {/* Main Footer Content - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* CỘT 1: Thương hiệu & Giới thiệu */}
          <div className="flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2 text-3xl font-bold mb-6 cursor-pointer">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                D
              </div>
              <span className="bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                DocGo
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Hệ thống đặt lịch khám bệnh trực tuyến hàng đầu, kết nối hàng
              triệu bệnh nhân với các chuyên gia y tế, bác sĩ giỏi và bệnh viện
              uy tín trên toàn quốc.
            </p>
            {/* Chứng nhận (Giả lập Badge Bộ Công Thương / Bộ Y Tế) */}
            <div className="flex items-center gap-4 mt-auto">
              <div className="h-10 w-28 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
                <span className="text-xs font-semibold text-slate-500">
                  Đã thông báo BCT
                </span>
              </div>
            </div>
          </div>

          {/* CỘT 2: Dịch vụ nổi bật */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-6 uppercase tracking-wider relative inline-block">
              Dịch vụ nổi bật
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-blue-600 rounded-full"></span>
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                "Khám chuyên khoa",
                "Khám tổng quát",
                "Xét nghiệm y học",
                "Tầm soát ung thư",
                "Khám nha khoa",
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    to="#"
                    className="group flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <RightOutlined className="text-[10px] mr-2 text-blue-600 group-hover:text-cyan-400 transition-colors" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CỘT 3: Hỗ trợ khách hàng */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-6 uppercase tracking-wider relative inline-block">
              Hỗ trợ khách hàng
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-blue-600 rounded-full"></span>
            </h3>
            <ul className="flex flex-col gap-3">
              {[
                "Hướng dẫn đặt khám",
                "Câu hỏi thường gặp (FAQ)",
                "Quy trình hoàn phí",
                "Chính sách bảo mật",
                "Điều khoản sử dụng",
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    to="#"
                    className="group flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <RightOutlined className="text-[10px] mr-2 text-blue-600 group-hover:text-cyan-400 transition-colors" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CỘT 4: Liên hệ & Mạng xã hội */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-6 uppercase tracking-wider relative inline-block">
              Thông tin liên hệ
              <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-blue-600 rounded-full"></span>
            </h3>
            <ul className="flex flex-col gap-4 mb-6">
              <li className="flex items-start gap-3 text-sm">
                <EnvironmentOutlined className="text-blue-500 text-lg mt-0.5" />
                <span className="text-slate-400 leading-relaxed">
                  Tòa nhà Y Tế Việt, 123 Đường X, Quận Y, TP. Hà Nội
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <PhoneOutlined className="text-blue-500 text-lg" />
                <span className="text-slate-400 font-medium">
                  1900 2115 (Hỗ trợ 24/7)
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <MailOutlined className="text-blue-500 text-lg" />
                <span className="text-slate-400">cskh@docgo.vn</span>
              </li>
            </ul>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <FacebookFilled className="text-xl" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-black hover:text-white transition-all duration-300"
              >
                <TikTokFilled className="text-xl" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-red-600 hover:text-white transition-all duration-300"
              >
                <YoutubeFilled className="text-xl" />
              </a>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR: Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 text-center md:text-left">
            © {new Date().getFullYear()} DocGo. Nền tảng y tế số toàn diện. Đã
            đăng ký bản quyền.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="#" className="hover:text-cyan-400 transition-colors">
              Cài đặt Cookie
            </Link>
            <Link to="#" className="hover:text-cyan-400 transition-colors">
              Sơ đồ trang web
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
