import { useAuthStore } from "@/stores/authStore";
import { Typography, Row, Col } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

// Component Thẻ thống kê tái sử dụng
const StatCard = ({ title, value, icon, colorClass, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div>
        <Text className="text-slate-500 font-medium block mb-1">{title}</Text>
        <Title
          level={2}
          className="mb-0! text-slate-800! font-bold! tracking-tight"
        >
          {value}
        </Title>
      </div>
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${colorClass}`}
      >
        {icon}
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-emerald-500 flex items-center font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
          <RiseOutlined className="mr-1" /> {trend}
        </span>
        <span className="text-slate-400">so với tháng trước</span>
      </div>
    )}
  </div>
);

const DashboardHome = () => {
  const { user } = useAuthStore();

  if (user?.role === "admin") {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Title level={3} className="mb-1! text-slate-800!">
            Tổng quan hệ thống
          </Title>
          <Text className="text-slate-500">
            Xin chào Quản trị viên, đây là tình hình hoạt động hôm nay.
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              title="Tổng số Bác sĩ"
              value="112"
              icon={<UserOutlined />}
              colorClass="bg-blue-50 text-blue-600"
              trend="+12%"
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              title="Tổng Bệnh nhân"
              value="1,128"
              icon={<TeamOutlined />}
              colorClass="bg-indigo-50 text-indigo-600"
              trend="+5.4%"
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              title="Lịch hẹn hôm nay"
              value="93"
              icon={<CalendarOutlined />}
              colorClass="bg-amber-50 text-amber-600"
              trend="+18%"
            />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              title="Doanh thu (Tháng)"
              value="845.5M"
              icon={<DollarOutlined />}
              colorClass="bg-emerald-50 text-emerald-600"
              trend="+22%"
            />
          </Col>
        </Row>
      </div>
    );
  }

  if (user?.role === "doctor") {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Title level={3} className="mb-1! text-slate-800!">
            Bàn làm việc của Bác sĩ
          </Title>
          <Text className="text-slate-500">
            Chúc bạn một ngày làm việc hiệu quả, {user?.fullName || "Bác sĩ"}.
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <StatCard
              title="Lịch hẹn hôm nay"
              value="12"
              icon={<CalendarOutlined />}
              colorClass="bg-blue-50 text-blue-600"
            />
          </Col>
          <Col xs={24} md={8}>
            <StatCard
              title="Bệnh nhân đang chờ"
              value="5"
              icon={<UserOutlined />}
              colorClass="bg-rose-50 text-rose-600"
            />
          </Col>
          <Col xs={24} md={8}>
            <StatCard
              title="Doanh thu dự kiến"
              value="12.500.000đ"
              icon={<DollarOutlined />}
              colorClass="bg-emerald-50 text-emerald-600"
              trend="+8%"
            />
          </Col>
        </Row>
      </div>
    );
  }

  return null;
};

export default DashboardHome;
