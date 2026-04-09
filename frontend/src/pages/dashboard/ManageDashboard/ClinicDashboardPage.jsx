// src/pages/ClinicDashboardPage.jsx
import { httpGet } from "@/services/http";
import { formatDateForBackend, formatDateUTC } from "@/utils/date";
import {
  CalendarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Grid,
  Progress,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import ClinicReviewStats from "./components/ClinicReviewStats";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const ClinicDashboardPage = () => {
  const screens = useBreakpoint();
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await httpGet("/clinic-admin/dashboard", params, false);
      setDashboardData(response);
    } catch (err) {
      console.error("Lỗi tải dashboard phòng khám:", err);
      setError(err?.message || "Không thể tải dữ liệu thống kê.");
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApplyFilter = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = formatDateForBackend(dateRange[0]);
      const end = formatDateForBackend(dateRange[1]);
      fetchDashboardData(start, end);
    } else {
      fetchDashboardData();
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <Spin
          size="large"
          tip="Đang tổng hợp dữ liệu phòng khám..."
          className="text-blue-600!"
        />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
        <Alert
          message="Không thể tải dữ liệu"
          description={error}
          type="error"
          showIcon
          className="rounded-2xl! shadow-sm! border-red-200! p-6!"
        />
      </div>
    );
  }

  if (!dashboardData) return null;

  const { overview, appointmentStats, revenueStats, topDoctors } =
    dashboardData;

  const doctorColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      align: "center",
      render: (_, __, index) => (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${
            index === 0
              ? "bg-amber-100 text-amber-600"
              : index === 1
                ? "bg-slate-200 text-slate-600"
                : index === 2
                  ? "bg-orange-100 text-orange-600"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {index + 1}
        </div>
      ),
    },
    {
      title: "Bác sĩ",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => (
        <Text className="font-semibold! text-slate-700!">{text}</Text>
      ),
    },
    {
      title: "Chuyên khoa",
      dataIndex: "specialtyName",
      key: "specialtyName",
      render: (text) => <span className="text-slate-500">{text}</span>,
    },
    {
      title: "Số ca khám",
      dataIndex: "appointmentCount",
      key: "appointmentCount",
      align: "right",
      sorter: (a, b) => a.appointmentCount - b.appointmentCount,
      defaultSortOrder: "descend",
      render: (count) => (
        <Tag
          color="blue"
          className="rounded-md! border-0! font-semibold! mr-0! px-3! py-1! bg-blue-50! text-blue-600!"
        >
          {count} ca
        </Tag>
      ),
    },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Title level={2} className="m-0! text-slate-800! font-bold!">
            Dashboard Quản Trị
          </Title>
          <Text type="secondary" className="text-sm! mt-1! block!">
            Phòng khám:{" "}
            <span className="font-bold text-slate-700">
              {overview.clinicName}
            </span>
          </Text>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={setDateRange}
            placeholder={["Từ ngày", "Đến ngày"]}
            className="rounded-lg! py-2! shadow-sm!"
            style={{ width: screens.xs ? "100%" : "280px" }}
          />
          <Button
            type="primary"
            onClick={handleApplyFilter}
            loading={loading}
            className="rounded-lg! h-10! font-medium! bg-blue-600! hover:bg-blue-700! shadow-sm!"
          >
            Áp dụng bộ lọc
          </Button>
        </div>
      </div>

      {/* 4 Thẻ KPI Tổng Quan - Thiết kế theo chuẩn Enterprise (dùng div thuần để dễ custom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TeamOutlined className="text-emerald-500! text-2xl!" />
            </div>
            <div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Bác sĩ hoạt động
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {overview.totalDoctors}
              </div>
            </div>
          </div>
        </div>
        {/* KPI 2 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <UserOutlined className="text-blue-500! text-2xl!" />
            </div>
            <div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Bệnh nhân
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {overview.totalPatients}
              </div>
            </div>
          </div>
        </div>
        {/* KPI 3 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <CalendarOutlined className="text-purple-500! text-2xl!" />
            </div>
            <div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Tổng lịch hẹn
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {appointmentStats.total}
              </div>
            </div>
          </div>
        </div>
        {/* KPI 4 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <DollarOutlined className="text-orange-500! text-2xl!" />
            </div>
            <div>
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                Thực nhận
              </div>
              <div
                className="text-2xl font-bold text-orange-600 truncate max-w-[150px]"
                title={formatCurrency(revenueStats.clinicRevenue)}
              >
                {formatCurrency(revenueStats.clinicRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cột giữa: Trạng thái lịch & Doanh thu chi tiết */}
      <Row gutter={[20, 20]} className="mb-8!">
        {/* Cột Lịch Hẹn */}
        <Col xs={24} lg={12} className="flex!">
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! w-full! flex-1!"
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarOutlined className="text-blue-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Trạng thái lịch hẹn
                </span>
              </div>
            }
            extra={
              <Tag className="rounded-full! border-0! bg-slate-100! text-slate-600! font-medium! px-3! py-1!">
                Tổng: {appointmentStats.total} ca
              </Tag>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <span className="text-slate-500 text-xs font-medium mb-1 text-center">
                  Chờ Check-in
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {appointmentStats.breakdown.confirmed}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <span className="text-slate-500 text-xs font-medium mb-1 text-center">
                  Đã Check-in
                </span>
                <span className="text-2xl font-bold text-amber-500">
                  {appointmentStats.breakdown.checked_in}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <span className="text-slate-500 text-xs font-medium mb-1 text-center">
                  Hoàn thành
                </span>
                <span className="text-2xl font-bold text-emerald-500">
                  {appointmentStats.breakdown.completed}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <span className="text-slate-500 text-xs font-medium mb-1 text-center">
                  Đã hủy
                </span>
                <span className="text-2xl font-bold text-rose-500">
                  {appointmentStats.breakdown.cancelled}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-700">
                  Tỷ lệ hủy lịch
                </span>
                <span className="font-bold text-rose-600 text-lg">
                  {appointmentStats.cancellationRate?.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={appointmentStats.cancellationRate}
                showInfo={false}
                strokeColor="#e11d48"
                trailColor="#e2e8f0"
                size={["100%", 10]}
                className="m-0!"
              />
            </div>
          </Card>
        </Col>

        {/* Cột Doanh Thu */}
        <Col xs={24} lg={12} className="flex!">
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! w-full! flex-1! flex! flex-col!"
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarOutlined className="text-emerald-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Dòng tiền & Doanh thu
                </span>
              </div>
            }
          >
            {/* Thực nhận */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl mb-6 border border-emerald-100">
              <div className="text-emerald-800 font-medium mb-2">
                Doanh thu thực nhận kỳ này
              </div>
              <div className="flex items-end justify-between flex-wrap gap-2">
                <span className="text-4xl font-black text-emerald-700">
                  {formatCurrency(revenueStats.clinicRevenue)}
                </span>
                <Tag
                  color="green"
                  className="rounded-full! border-0! m-0! bg-emerald-100! text-emerald-700! px-3! py-1! font-medium!"
                >
                  {revenueStats.transactionCount} Giao dịch
                </Tag>
              </div>
            </div>

            {/* Chi tiết nguồn thu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
              <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CreditCardOutlined className="text-base!" />
                  </div>
                  <span className="font-semibold text-slate-700">
                    Thanh toán Online
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold text-slate-800">
                    {formatCurrency(revenueStats.online?.revenue)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {revenueStats.online?.transactionCount || 0} GD
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <ShopOutlined className="text-base!" />
                  </div>
                  <span className="font-semibold text-slate-700">
                    Thu tại quầy
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold text-slate-800">
                    {formatCurrency(revenueStats.offline?.revenue)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {revenueStats.offline?.transactionCount || 0} GD
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bảng Hiệu Suất Bác Sĩ */}
      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! overflow-hidden!"
            bodyStyle={{ padding: 0 }}
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <TeamOutlined className="text-indigo-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Hiệu suất bác sĩ hàng đầu
                </span>
              </div>
            }
          >
            <Table
              columns={doctorColumns}
              dataSource={topDoctors}
              rowKey="_id"
              pagination={false}
              scroll={{ x: "max-content" }}
              className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-600! [&_.ant-table-thead_th]:font-semibold! m-0!"
            />
          </Card>
        </Col>
      </Row>

      {/* Component Đánh Giá */}
      <ClinicReviewStats dateRange={dateRange} />

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Text className="text-slate-500! text-sm!">
          Dữ liệu báo cáo nội bộ phòng khám.
        </Text>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 shadow-sm">
          Thời gian:{" "}
          <span className="font-bold text-slate-800">
            {formatDateUTC(overview.period.startDate, "DD/MM/YYYY")}
          </span>{" "}
          -{" "}
          <span className="font-bold text-slate-800">
            {formatDateUTC(overview.period.endDate, "DD/MM/YYYY")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClinicDashboardPage;
