import { images } from "@/assets";
import { CheckCircleFilled } from "@ant-design/icons";

const Banner = () => {
  const features = [
    "Đặt khám nhanh - Lấy số thứ tự trực tuyến - Tư vấn sức khỏe từ xa",
    "Đặt khám theo giờ - Đặt càng sớm để có số thứ tự thấp nhất",
    "Được hoàn tiền khi hủy khám - Có cơ hội nhận ưu đãi hoàn tiền",
  ];

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#eaf4ff] to-[#d4e6fa]">
      {/* Background images với overlay tinh tế */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat md:hidden"
        style={{ backgroundImage: `url(${images.bannerMobile})` }}
      />
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ backgroundImage: `url(${images.bannerDesktop})` }}
      />
      {/* Overlay màu xanh nhẹ giúp chữ nổi bật hơn */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#003b5c]/70 to-[#005a8d]/50 md:from-[#003b5c]/60 md:to-transparent" />

      {/* Nội dung chính */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center md:items-start justify-center min-h-[500px] md:min-h-[600px] lg:min-h-[700px] py-16 md:py-20">
          {/* Tiêu đề */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center md:text-left leading-tight max-w-3xl drop-shadow-lg">
            Kết nối Người Dân với <br className="hidden sm:block" />
            <span className="text-[#f7d44b]">
              Cơ sở & Dịch vụ Y tế hàng đầu
            </span>
          </h1>

          {/* Mô tả ngắn (có thể thêm) */}
          <p className="mt-4 text-lg sm:text-xl text-white/90 text-center md:text-left max-w-2xl drop-shadow">
            Đặt lịch khám nhanh chóng, an toàn và tiện lợi cùng mạng lưới bệnh
            viện, phòng khám uy tín.
          </p>

          {/* Danh sách tính năng */}
          <div className="mt-8 md:mt-10 flex flex-col gap-4 w-full max-w-2xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CheckCircleFilled className="text-[#10b981] text-2xl flex-shrink-0 mt-0.5" />
                <span className="text-[#003b5c] text-base md:text-lg font-medium">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Nút hành động */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
            <button className="cursor-pointer bg-[#f7d44b] hover:bg-[#e5c03a] text-[#003b5c] font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Đặt khám ngay
            </button>
            <button className="cursor-pointer bg-transparent border-2 border-white text-white hover:bg-white/20 font-semibold py-3 px-8 rounded-full text-lg backdrop-blur-sm transition-all duration-300">
              Tìm hiểu thêm
            </button>
          </div>
        </div>
      </div>

      {/* Decorative wave (tuỳ chọn, tạo điểm nhấn) */}
      <div className="absolute bottom-0 left-0 w-full">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
            fillOpacity="0.1"
          />
        </svg>
      </div>
    </section>
  );
};

export default Banner;
