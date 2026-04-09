// src/pages/DoctorDashboardPage.jsx
import { httpGet } from "@/services/http";
import { formatDateForBackend, formatDateUTC } from "@/utils/date";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
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
import DoctorReviewStats from "./components/DoctorReviewStats";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const DoctorDashboardPage = () => {
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
      const response = await httpGet("/doctors/dashboard", params, false);
      setDashboardData(response);
    } catch (err) {
      console.error("Lỗi tải dashboard bác sĩ:", err);
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
          tip="Đang tải dữ liệu tổng quan..."
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
          className="rounded-xl! shadow-sm! border-red-200!"
        />
      </div>
    );
  }

  if (!dashboardData) return null;

  const {
    overview,
    dailyTrend,
    weeklyDistribution,
    shiftDistribution,
    topPatients,
  } = dashboardData;

  const formatNumber = (num) => new Intl.NumberFormat("vi-VN").format(num || 0);

  // Cấu hình cột cho bảng Top Bệnh Nhân
  const patientColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      align: "center",
      render: (_, __, index) => (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
      title: "Tên bệnh nhân",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => (
        <Text className="font-medium! text-slate-700!">
          {text || "Chưa cập nhật"}
        </Text>
      ),
    },
    {
      title: "Số lần khám",
      dataIndex: "appointmentCount",
      key: "appointmentCount",
      align: "right",
      render: (count) => (
        <Tag
          color="blue"
          className="rounded-md! border-0! font-semibold! mr-0! px-3! py-1!"
        >
          {count} lần
        </Tag>
      ),
    },
  ];

  // Cấu hình cột cho bảng Xu hướng ngày
  const dailyColumns = [
    {
      title: "Ngày khám",
      dataIndex: "date",
      key: "date",
      render: (text) => (
        <Text className="font-medium! text-slate-600!">
          {formatDateUTC(text, "DD/MM/YYYY")}
        </Text>
      ),
    },
    {
      title: "Hoàn thành",
      dataIndex: "completed",
      key: "completed",
      align: "right",
      render: (val) => (
        <div className="flex items-center justify-end gap-2">
          <span className="text-emerald-600 font-semibold">{val}</span>
          <CheckCircleOutlined className="text-emerald-500! text-xs!" />
        </div>
      ),
    },
    {
      title: "Đã hủy",
      dataIndex: "cancelled",
      key: "cancelled",
      align: "right",
      render: (val) => (
        <div className="flex items-center justify-end gap-2">
          <span className="text-rose-500 font-semibold">{val}</span>
          <CloseCircleOutlined className="text-rose-400! text-xs!" />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Title level={2} className="m-0! text-slate-800! font-bold!">
            Tổng Quan Hoạt Động
          </Title>
          <Text type="secondary" className="text-sm! mt-1! block!">
            Theo dõi và quản lý hiệu suất khám bệnh của bạn
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
            Lọc dữ liệu
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[20, 20]} className="mb-8!">
        <Col xs={24} sm={12} lg={6}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <CalendarOutlined className="text-blue-600! text-xl!" />
              </div>
              <Tag className="rounded-full! border-0! bg-slate-100! text-slate-600! font-medium!">
                Tổng cộng
              </Tag>
            </div>
            <div className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wide">
              Tổng lịch hẹn
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {formatNumber(overview.totalAppointments)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <TeamOutlined className="text-emerald-600! text-xl!" />
              </div>
              <Tag className="rounded-full! border-0! bg-emerald-50! text-emerald-600! font-medium!">
                Thành công
              </Tag>
            </div>
            <div className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wide">
              Đã hoàn thành
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {formatNumber(overview.completedAppointments)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <ClockCircleOutlined className="text-rose-600! text-xl!" />
              </div>
              <Tag className="rounded-full! border-0! bg-rose-50! text-rose-600! font-medium!">
                Hủy bỏ
              </Tag>
            </div>
            <div className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wide">
              Lịch đã hủy
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {formatNumber(overview.cancelledAppointments)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <UserOutlined className="text-purple-600! text-xl!" />
              </div>
              <Tag className="rounded-full! border-0! bg-purple-50! text-purple-600! font-medium!">
                Khách hàng
              </Tag>
            </div>
            <div className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wide">
              Bệnh nhân duy nhất
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {formatNumber(overview.uniquePatients)}
            </div>
          </div>
        </Col>
      </Row>

      {/* Middle Section: Status & Shifts */}
      <Row gutter={[20, 20]} className="mb-8!">
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
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                <span className="text-slate-500 text-xs font-medium mb-1">
                  Chờ xác nhận
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatNumber(overview.confirmedAppointments)}
                </span>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col items-center justify-center">
                <span className="text-slate-500 text-xs font-medium mb-1">
                  Đã Check-in
                </span>
                <span className="text-2xl font-bold text-amber-500">
                  {formatNumber(overview.checkedInAppointments)}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center col-span-2 md:col-span-1">
                <span className="text-slate-500 text-xs font-medium mb-1">
                  Chờ thanh toán
                </span>
                <span className="text-2xl font-bold text-slate-600">
                  {formatNumber(overview.pendingPaymentAppointments)}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-700">
                  Tỷ lệ hủy lịch báo động
                </span>
                <span className="font-bold text-rose-600 text-lg">
                  {overview.cancellationRate?.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={overview.cancellationRate}
                showInfo={false}
                strokeColor="#e11d48"
                trailColor="#e2e8f0"
                size={["100%", 10]}
                className="m-0!"
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12} className="flex!">
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! w-full! flex-1!"
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ClockCircleOutlined className="text-orange-500!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Phân bổ theo ca (Buổi)
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-4 h-full content-start">
              {shiftDistribution.length > 0 ? (
                shiftDistribution.map((item, index) => (
                  <div
                    key={item.shift}
                    className="flex items-center p-5 bg-white border border-slate-200 rounded-xl hover:border-orange-300 transition-colors"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${index % 2 === 0 ? "bg-orange-50 text-orange-500" : "bg-indigo-50 text-indigo-500"}`}
                    >
                      <ClockCircleOutlined className="text-xl!" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1">
                        {item.shift}
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {item.count}{" "}
                        <span className="text-sm font-normal text-slate-400">
                          ca
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10">
                  <Text type="secondary" className="text-slate-400!">
                    Chưa có dữ liệu phân bổ ca khám
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Daily Trend Table */}
      <Row gutter={[20, 20]} className="mb-8!">
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
                  <LineChartOutlined className="text-indigo-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Xu hướng theo ngày
                </span>
              </div>
            }
          >
            <Table
              columns={dailyColumns}
              dataSource={dailyTrend}
              rowKey="date"
              pagination={{ pageSize: 5 }}
              scroll={{ x: "max-content" }}
              className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-600! [&_.ant-table-thead_th]:font-semibold! m-0!"
            />
          </Card>
        </Col>
      </Row>

      {/* Patients & Weekly Distribution */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12} className="flex!">
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! w-full! flex-1! overflow-hidden!"
            bodyStyle={{ padding: 0 }}
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <UserOutlined className="text-teal-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Top 5 Bệnh Nhân (Tần suất)
                </span>
              </div>
            }
          >
            <Table
              columns={patientColumns}
              dataSource={topPatients}
              rowKey="patientId"
              pagination={false}
              scroll={{ x: "max-content" }}
              className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-600! [&_.ant-table-thead_th]:font-semibold! m-0!"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12} className="flex!">
          <Card
            className="rounded-2xl! shadow-sm! border-slate-200! w-full! flex-1!"
            headStyle={{
              borderBottom: "1px solid #f1f5f9",
              padding: "16px 24px",
            }}
            title={
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <CalendarOutlined className="text-purple-600!" />
                </div>
                <span className="font-bold text-slate-800 text-base">
                  Mật độ theo ngày trong tuần
                </span>
              </div>
            }
          >
            <div className="flex flex-col gap-5 py-2">
              {weeklyDistribution.map((item) => {
                const percent =
                  overview.completedAppointments > 0
                    ? (item.count / overview.completedAppointments) * 100
                    : 0;

                return (
                  <div key={item.dayOfWeek} className="flex items-center gap-4">
                    <div className="w-20 text-slate-600 font-medium text-sm">
                      {item.dayOfWeek}
                    </div>
                    <div className="flex-1">
                      <Progress
                        percent={percent}
                        showInfo={false}
                        strokeColor="#8b5cf6" // Purple-500
                        trailColor="#f1f5f9"
                        size={["100%", 10]}
                        className="m-0!"
                      />
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-slate-800 font-bold">
                        {item.count}
                      </span>
                      <span className="text-slate-400 text-xs ml-1">ca</span>
                    </div>
                  </div>
                );
              })}
              {weeklyDistribution.length === 0 && (
                <div className="text-center py-10">
                  <Text type="secondary" className="text-slate-400!">
                    Chưa có dữ liệu phân bố tuần
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Review Stats Component */}
      <DoctorReviewStats dateRange={dateRange} />

      {/* Footer Info */}
      <div className="mt-6 text-center md:text-right text-slate-400! text-xs!">
        Dữ liệu thống kê từ{" "}
        <strong>
          {formatDateUTC(overview.period?.startDate, "DD/MM/YYYY")}
        </strong>{" "}
        đến{" "}
        <strong>{formatDateUTC(overview.period?.endDate, "DD/MM/YYYY")}</strong>
      </div>
    </div>
  );
};

export default DoctorDashboardPage;
