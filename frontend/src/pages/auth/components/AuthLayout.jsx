import { Row, Col, Typography } from "antd";

const { Title, Text } = Typography;

const AuthLayout = ({ children }) => {
  return (
    <Row className="min-h-screen bg-white">
      {/* Cột trái (Form): Chiếm 40% trên màn hình lớn. Bố cục tối giản, sang trọng */}
      <Col
        xs={24}
        lg={10}
        xl={9}
        className="flex w-full!  py-12 flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 bg-white relative z-10 shadow-[20px_0_30px_-15px_rgba(0,0,0,0.05)]"
      >
        <div className="w-full max-w-100 mx-auto">
          {/* Logo Brand (Giả lập) */}
          <div className="mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">+</span>
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              MediCare
            </span>
          </div>

          {children}
        </div>
      </Col>

      {/* Cột phải (Hình ảnh): Chiếm 60% trên màn hình lớn */}
      <Col
        xs={0}
        lg={14}
        xl={15}
        className="relative hidden lg:block overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1638202993928-7267aad84c31?q=80&w=2187&auto=format&fit=crop')", // Ảnh y tế sang trọng, tone xanh/trắng
          }}
        >
          {/* Lớp phủ Gradient mượt mà */}
          <div className="absolute inset-0 bg-linear-to-br from-blue-900/80 via-slate-900/60 to-slate-900/90 flex flex-col justify-end p-20">
            <div className="max-w-2xl animate-fade-in-up">
              <Title
                level={1}
                className="text-white! font-bold! text-4xl! mb-4! tracking-tight!"
              >
                Chăm sóc sức khỏe
                <br />
                Tiêu chuẩn quốc tế
              </Title>
              <Text className="text-slate-300! text-lg leading-relaxed font-light">
                Hệ thống đặt lịch khám trực tuyến an toàn, bảo mật. Kết nối ngay
                với đội ngũ chuyên gia và bác sĩ đầu ngành chỉ với vài thao tác.
              </Text>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default AuthLayout;
