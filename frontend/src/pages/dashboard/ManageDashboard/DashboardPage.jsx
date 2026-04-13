import { httpGet } from "@/services/http";
import { formatDateForBackend, formatDateUTC } from "@/utils/date";
import {
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  MedicineBoxOutlined,
  MessageOutlined,
  PieChartOutlined,
  StarFilled,
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
  Rate,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const DashboardPage = () => {
  const screens = useBreakpoint();
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const [dashboardRes, reviewRes] = await Promise.all([
        httpGet("/admin/dashboard", params, false),
        httpGet("/admin/reviews", params, false).catch((err) => {
          console.error("Lỗi tải review stats:", err);
          return null;
        }),
      ]);
      setDashboardData(dashboardRes);
      setReviewData(reviewRes);
    } catch (err) {
      console.error("Lỗi tải dashboard:", err);
      setError(err?.message || "Không thể tải dữ liệu thống kê.");
      setDashboardData(null);
      setReviewData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const groupDataByWeek = (data, dateKey) => {
    if (!data || data.length <= 60) return data;
    const weeks = {};
    data.forEach((item) => {
      const date = new Date(item[dateKey]);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1); // Thứ 2
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          date: weekKey,
          completed: 0,
          cancelled: 0,
          confirmed: 0,
          checked_in: 0,
          online: 0,
          offline: 0,
        };
      }
      weeks[weekKey].completed += item.completed || 0;
      weeks[weekKey].cancelled += item.cancelled || 0;
      weeks[weekKey].confirmed += item.confirmed || 0;
      weeks[weekKey].checked_in += item.checked_in || 0;
      weeks[weekKey].online += item.online || 0;
      weeks[weekKey].offline += item.offline || 0;
    });
    return Object.values(weeks);
  };

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
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Spin size="large" tip="Đang tải hệ thống..." />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
        <Alert
          message="Lỗi tải dữ liệu"
          description={error}
          type="error"
          showIcon
          className="rounded-xl! shadow-sm!"
        />
      </div>
    );
  }

  if (!dashboardData) return null;

  const { overview, appointmentStats, revenueStats, topDoctors, topClinics } =
    dashboardData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactNumber = (number) => {
    return new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  };

  // Cấu hình UI cho các phần hiển thị dữ liệu
  const doctorColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      render: (_, __, index) => (
        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </div>
      ),
    },
    {
      title: "Bác sĩ",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => (
        <span className="font-medium text-slate-700">{text}</span>
      ),
    },
    { title: "Chuyên khoa", dataIndex: "specialtyName", key: "specialtyName" },
    {
      title: "Số ca",
      dataIndex: "appointmentCount",
      key: "appointmentCount",
      align: "right",
      sorter: (a, b) => a.appointmentCount - b.appointmentCount,
      defaultSortOrder: "descend",
      render: (count) => (
        <Tag
          color="blue"
          className="rounded-md! border-0! font-semibold! mr-0!"
        >
          {count}
        </Tag>
      ),
    },
  ];

  const clinicColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      render: (_, __, index) => (
        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </div>
      ),
    },
    {
      title: "Phòng khám",
      dataIndex: "clinicName",
      key: "clinicName",
      render: (text) => (
        <span className="font-medium text-slate-700">{text}</span>
      ),
    },
    {
      title: "Số ca",
      dataIndex: "totalAppointments",
      key: "totalAppointments",
      align: "right",
      sorter: (a, b) => a.totalAppointments - b.totalAppointments,
      defaultSortOrder: "descend",
      render: (count) => (
        <Tag
          color="purple"
          className="rounded-md! border-0! font-semibold! mr-0!"
        >
          {count}
        </Tag>
      ),
    },
  ];

  const performerColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 70,
      render: (_, __, index) => (
        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </div>
      ),
    },
    {
      title: "Đối tượng",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <div>
          <div className="font-medium text-slate-700">{text}</div>
          <Tag
            color={record.type === "doctor" ? "blue" : "purple"}
            className="rounded-sm! border-0! mt-1! text-[10px]!"
          >
            {record.type === "doctor" ? "Bác sĩ" : "Phòng khám"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Đánh giá",
      dataIndex: "averageRating",
      key: "averageRating",
      align: "center",
      render: (rating) => (
        <div className="flex items-center justify-center gap-1 font-semibold text-amber-500">
          {rating} <StarFilled className="text-xs!" />
        </div>
      ),
    },
    {
      title: "Số lượt",
      dataIndex: "totalReviews",
      key: "totalReviews",
      align: "right",
      render: (count) => (
        <span className="font-medium text-slate-600">{count}</span>
      ),
    },
  ];

  const kpiItems = [
    {
      title: "Bệnh nhân hoạt động",
      value: overview.users.patient.active,
      icon: UserOutlined,
      bgClass: "bg-blue-50",
      iconClass: "text-blue-500",
      valueClass: "text-blue-600",
      subItems: [
        {
          label: "Không hoạt động",
          value: overview.users.patient.inactive,
          dotColor: "bg-slate-300",
        },
        {
          label: "Bị cấm",
          value: overview.users.patient.banned,
          dotColor: "bg-red-400",
        },
      ],
    },
    {
      title: "Bác sĩ hoạt động",
      value: overview.users.doctor.active,
      icon: TeamOutlined,
      bgClass: "bg-emerald-50",
      iconClass: "text-emerald-500",
      valueClass: "text-emerald-600",
      subItems: [
        {
          label: "Không hoạt động",
          value: overview.users.doctor.inactive,
          dotColor: "bg-slate-300",
        },
        {
          label: "Bị cấm",
          value: overview.users.doctor.banned,
          dotColor: "bg-red-400",
        },
      ],
    },
    {
      title: "Phòng khám duyệt",
      value: overview.totalClinics,
      icon: BankOutlined,
      bgClass: "bg-purple-50",
      iconClass: "text-purple-500",
      valueClass: "text-purple-600",
      subItems: [],
    },
    {
      title: "Chuyên khoa",
      value: overview.totalSpecialties,
      icon: MedicineBoxOutlined,
      bgClass: "bg-orange-50",
      iconClass: "text-orange-500",
      valueClass: "text-orange-600",
      subItems: [],
    },
  ];

  const dailyChartData = (dashboardData.dailyAppointments || []).map(
    (item) => ({
      date: item._id,
      completed: item.completed,
      cancelled: item.cancelled,
      confirmed: item.confirmed,
      checked_in: item.checked_in,
    }),
  );

  const customTooltipStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
    border: "none",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    padding: "12px 16px",
    fontSize: "13px",
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Title level={2} className="!m-0! !text-slate-800! font-bold!">
            Tổng quan hệ thống
          </Title>
          <Text type="secondary" className="text-sm! mt-1! block!">
            Quản trị toàn bộ hoạt động đặt lịch và thanh toán
          </Text>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={setDateRange}
            placeholder={["Từ ngày", "Đến ngày"]}
            className="rounded-lg! py-2!"
            style={{ width: screens.xs ? "100%" : "260px" }}
          />
          <Button
            type="primary"
            onClick={handleApplyFilter}
            loading={loading}
            className="rounded-lg! h-10! font-medium! bg-blue-600! hover:bg-blue-700!"
          >
            Áp dụng bộ lọc
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-6!">
        {kpiItems.map((item, idx) => (
          <Col xs={12} sm={12} md={12} xl={6} key={idx}>
            <Card
              size="small"
              className="rounded-xl! shadow-sm! border-0! h-full!"
            >
              <div className="flex items-start gap-3 p-1">
                <div
                  className={`w-12 h-12 rounded-full ${item.bgClass} flex items-center justify-center shrink-0`}
                >
                  <item.icon className={`text-xl! ${item.iconClass}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <Text
                    type="secondary"
                    className="text-xs! uppercase! tracking-wider! font-medium! block!"
                  >
                    {item.title}
                  </Text>
                  <div
                    className={`text-2xl font-bold ${item.valueClass} mt-1 leading-none`}
                  >
                    {item.value}
                  </div>
                  {item.subItems.length > 0 && (
                    <div className="flex flex-col xl:flex-row gap-1 xl:gap-3 mt-3 text-xs text-slate-500">
                      {item.subItems.map((sub, subIdx) => (
                        <span
                          key={subIdx}
                          className="flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${sub.dotColor}`}
                          ></div>
                          {sub.label}: {sub.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Thống kê lịch hẹn & Doanh thu */}
      <Row gutter={[16, 16]} className="mb-6!">
        {/* Lịch hẹn */}
        <Col xs={24} xl={12}>
          <Card
            className="rounded-2xl! shadow-sm! border-0! h-full!"
            title={
              <div className="flex items-center gap-2">
                <CalendarOutlined className="text-blue-500!" />
                <span className="font-semibold text-slate-800">
                  Thống kê lịch hẹn
                </span>
              </div>
            }
            extra={
              <Tag
                color="blue"
                className="rounded-full! px-3! py-1! border-0! bg-blue-50! text-blue-600! font-medium!"
              >
                Tổng: {appointmentStats.total} ca
              </Tag>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center hover:bg-slate-50 transition-colors">
                <Text type="secondary" className="text-xs! block! mb-1!">
                  Chờ check-in
                </Text>
                <span className="text-xl font-bold text-blue-600">
                  {appointmentStats.breakdown.confirmed}
                </span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center hover:bg-slate-50 transition-colors">
                <Text type="secondary" className="text-xs! block! mb-1!">
                  Đã check-in
                </Text>
                <span className="text-xl font-bold text-amber-500">
                  {appointmentStats.breakdown.checked_in}
                </span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center hover:bg-slate-50 transition-colors">
                <Text type="secondary" className="text-xs! block! mb-1!">
                  Hoàn thành
                </Text>
                <span className="text-xl font-bold text-emerald-500">
                  {appointmentStats.breakdown.completed}
                </span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-center hover:bg-slate-50 transition-colors">
                <Text type="secondary" className="text-xs! block! mb-1!">
                  Đã hủy
                </Text>
                <span className="text-xl font-bold text-rose-500">
                  {appointmentStats.breakdown.cancelled}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <Text className="font-medium! text-slate-700!">
                  Tỷ lệ hủy lịch hệ thống
                </Text>
                <Text className="font-bold! text-rose-500!">
                  {appointmentStats.cancellationRate?.toFixed(1)}%
                </Text>
              </div>
              <Progress
                percent={appointmentStats.cancellationRate}
                showInfo={false}
                strokeColor="#f43f5e"
                trailColor="#e2e8f0"
                size={["100%", 8]}
                className="!m-0!"
              />
            </div>
          </Card>
        </Col>

        {/* Doanh thu */}
        <Col xs={24} xl={12}>
          <Card
            className="rounded-2xl! shadow-sm! border-0! h-full!"
            title={
              <div className="flex items-center gap-2">
                <DollarOutlined className="text-emerald-500!" />
                <span className="font-semibold text-slate-800">
                  Doanh thu tài chính
                </span>
              </div>
            }
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-linear-to-r from-emerald-50 to-teal-50 p-5 rounded-xl mb-6 border border-emerald-100">
              <div>
                <Text className="text-emerald-800! font-medium! block! mb-1!">
                  Tổng doanh thu
                </Text>
                <span className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(revenueStats.totalRevenue)}
                </span>
              </div>
              <div className="mt-3 sm:mt-0 text-left sm:text-right">
                <Text className="text-emerald-700! font-medium! block!">
                  {revenueStats.transactionCount} giao dịch
                </Text>
                <Text className="text-emerald-600/80! text-sm! block! mt-1!">
                  TB: {formatCurrency(revenueStats.averageTransaction)} / GD
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-100 bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                      💳
                    </div>
                    <Text className="font-semibold! text-slate-700!">
                      Trực tuyến
                    </Text>
                  </div>
                  <Tag
                    color="blue"
                    className="rounded-full! m-0! border-0! bg-blue-50! text-blue-600!"
                  >
                    {revenueStats.online?.transactionCount} GD
                  </Tag>
                </div>
                <span className="text-xl font-bold text-slate-800">
                  {formatCurrency(revenueStats.online?.revenue || 0)}
                </span>
              </div>
              <div className="border border-slate-100 bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                      🏥
                    </div>
                    <Text className="font-semibold! text-slate-700!">
                      Tiền mặt
                    </Text>
                  </div>
                  <Tag
                    color="green"
                    className="rounded-full! m-0! border-0! bg-emerald-50! text-emerald-600!"
                  >
                    {revenueStats.offline?.transactionCount} GD
                  </Tag>
                </div>
                <span className="text-xl font-bold text-slate-800">
                  {formatCurrency(revenueStats.offline?.revenue || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <Text
                  type="secondary"
                  className="text-xs! uppercase! tracking-wide! mb-1! block!"
                >
                  Nền tảng (60%)
                </Text>
                <span className="text-lg font-bold text-indigo-600">
                  {formatCurrency(revenueStats.platformRevenue || 0)}
                </span>
              </div>
              <div>
                <Text
                  type="secondary"
                  className="text-xs! uppercase! tracking-wide! mb-1! block!"
                >
                  Đối tác (40%)
                </Text>
                <span className="text-lg font-bold text-amber-600">
                  {formatCurrency(revenueStats.clinicRevenue || 0)}
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* CHARTS SECTION (Được thiết kế lại hoàn toàn) */}
      <Row gutter={[16, 16]} className="mb-6!">
        {/* Biểu đồ xu hướng lịch hẹn (Bar Chart) */}
        <Col xs={24} lg={12}>
          <Card
            className="rounded-2xl! shadow-sm! border-0! h-full!"
            title={
              <div className="flex items-center gap-2 text-slate-800">
                <CalendarOutlined className="text-blue-500!" />
                <span>Xu hướng lịch hẹn</span>
              </div>
            }
          >
            {dashboardData.dailyAppointments &&
            dashboardData.dailyAppointments.length > 0 ? (
              <div className="h-80 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={customTooltipStyle}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "20px", fontSize: "13px" }}
                    />
                    {/* Bo tròn cột hiển thị bằng thuộc tính radius */}
                    <Bar
                      dataKey="confirmed"
                      fill="#3b82f6"
                      name="Chờ check-in"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="checked_in"
                      fill="#f59e0b"
                      name="Đã check-in"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="completed"
                      fill="#10b981"
                      name="Hoàn thành"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="cancelled"
                      fill="#f43f5e"
                      name="Đã hủy"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-400">
                Chưa có dữ liệu lịch hẹn
              </div>
            )}
          </Card>
        </Col>

        {/* Biểu đồ doanh thu (Area Chart cao cấp) */}
        <Col xs={24} lg={12}>
          <Card
            className="rounded-2xl! shadow-sm! border-0! h-full!"
            title={
              <div className="flex items-center gap-2 text-slate-800">
                <DollarOutlined className="text-emerald-500!" />
                <span>Biến động doanh thu</span>
              </div>
            }
          >
            <div className="h-80 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={groupDataByWeek(dashboardData.dailyRevenue, "date")}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorOnline"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorOffline"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  {/* Rút gọn số hiển thị trên trục Y để tránh lấn mất diện tích biểu đồ */}
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={formatCompactNumber}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value) => [formatCurrency(value), ""]}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "20px", fontSize: "13px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="online"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOnline)"
                    name="Trực tuyến"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="offline"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOffline)"
                    name="Tại quầy"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6!">
        {/* Biểu đồ tỷ trọng doanh thu (Donut Chart) */}
        <Col xs={24} md={10} lg={8}>
          <Card
            className="rounded-2xl! shadow-sm! border-0! h-full!"
            title={
              <div className="flex items-center gap-2 text-slate-800">
                <PieChartOutlined className="text-purple-500!" />
                <span>Cơ cấu doanh thu</span>
              </div>
            }
          >
            <div className="h-70 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Trực tuyến",
                        value: revenueStats.online?.revenue || 0,
                      },
                      {
                        name: "Tại quầy",
                        value: revenueStats.offline?.revenue || 0,
                      },
                    ]}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend
                    iconType="circle"
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: "13px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Top Tables thu gọn đặt cạnh Pie Chart cho cân đối màn hình Desktop */}
        <Col xs={24} md={14} lg={16}>
          <Row gutter={[16, 16]} className="h-full!">
            <Col xs={24} xl={12}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full! overflow-hidden!"
                styles={{ body: { padding: 0 } }}
                title={
                  <div className="flex items-center gap-2 px-2">
                    <TeamOutlined className="text-blue-500!" />
                    <span className="font-semibold text-slate-800">
                      Top 5 Bác sĩ nổi bật
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
                  className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-500! [&_.ant-table-thead_th]:font-medium! [&_.ant-table-tbody_td]:py-3!"
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full! overflow-hidden!"
                styles={{ body: { padding: 0 } }}
                title={
                  <div className="flex items-center gap-2 px-2">
                    <BankOutlined className="text-purple-500!" />
                    <span className="font-semibold text-slate-800">
                      Top 5 Phòng khám
                    </span>
                  </div>
                }
              >
                <Table
                  columns={clinicColumns}
                  dataSource={topClinics}
                  rowKey="clinicName"
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-500! [&_.ant-table-thead_th]:font-medium! [&_.ant-table-tbody_td]:py-3!"
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* THỐNG KÊ ĐÁNH GIÁ */}
      {reviewData && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageOutlined className="text-2xl text-indigo-500" />
            <Title level={3} className="m-0! text-slate-800! font-bold!">
              Thống kê đánh giá chất lượng
            </Title>
          </div>

          <Row gutter={[16, 16]} className="mb-6!">
            {/* Tổng quan & Phân bố */}
            <Col xs={24} lg={8}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full!"
                title={
                  <span className="font-semibold text-slate-800">
                    Tổng quan đánh giá
                  </span>
                }
              >
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="text-5xl font-bold text-slate-800 mb-2">
                    {reviewData.overview.averageRating}
                  </div>
                  <Rate
                    disabled
                    allowHalf
                    value={reviewData.overview.averageRating}
                    className="text-amber-400 text-lg!"
                  />
                  <Text className="text-slate-500! mt-2! font-medium!">
                    Dựa trên {reviewData.overview.totalReviews} lượt đánh giá
                  </Text>
                </div>

                <div className="flex flex-col gap-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviewData.distribution[`star${star}`] || 0;
                    const total = reviewData.overview.totalReviews || 1;
                    const percent = (count / total) * 100;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="w-8 flex items-center justify-end gap-1 text-slate-600 font-medium text-sm">
                          {star}{" "}
                          <StarFilled className="text-amber-400 text-xs!" />
                        </div>
                        <Progress
                          percent={percent}
                          showInfo={false}
                          strokeColor="#f59e0b"
                          trailColor="#f1f5f9"
                          className="m-0! flex-1"
                        />
                        <div className="w-8 text-right text-xs text-slate-500 font-medium">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>

            {/* Xu hướng đánh giá */}
            <Col xs={24} lg={16}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full!"
                title={
                  <span className="font-semibold text-slate-800">
                    Xu hướng điểm đánh giá
                  </span>
                }
              >
                {reviewData.trend && reviewData.trend.length > 0 ? (
                  <div className="h-80 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={reviewData.trend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          width={30}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={customTooltipStyle}
                          formatter={(value, name) => [
                            value,
                            name === "average" ? "Điểm TB" : "Số lượt",
                          ]}
                          labelFormatter={(label) => `Ngày: ${label}`}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{
                            paddingTop: "20px",
                            fontSize: "13px",
                          }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="average"
                          name="Điểm TB"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="count"
                          name="Số lượt"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-400">
                    Chưa có dữ liệu xu hướng
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6!">
            <Col xs={24} xl={12}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full! overflow-hidden!"
                styles={{ body: { padding: 0 } }}
                title={
                  <span className="font-semibold text-slate-800 px-2">
                    Top 5 được đánh giá cao nhất
                  </span>
                }
              >
                <Table
                  columns={performerColumns}
                  dataSource={reviewData.topPerformers}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-500! [&_.ant-table-thead_th]:font-medium! [&_.ant-table-tbody_td]:py-3!"
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                className="rounded-2xl! shadow-sm! border-0! h-full! overflow-hidden!"
                styles={{ body: { padding: 0 } }}
                title={
                  <span className="font-semibold text-slate-800 px-2">
                    Top 5 cần cải thiện
                  </span>
                }
              >
                <Table
                  columns={performerColumns}
                  dataSource={reviewData.bottomPerformers}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  className="[&_.ant-table-thead_th]:bg-slate-50! [&_.ant-table-thead_th]:text-slate-500! [&_.ant-table-thead_th]:font-medium! [&_.ant-table-tbody_td]:py-3!"
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 text-center md:text-right text-slate-400 text-xs">
        Dữ liệu thống kê hệ thống từ{" "}
        <strong className="text-slate-500">
          {formatDateUTC(overview.period.startDate, "DD/MM/YYYY")}
        </strong>{" "}
        đến{" "}
        <strong className="text-slate-500">
          {formatDateUTC(overview.period.endDate, "DD/MM/YYYY")}
        </strong>
      </div>
    </div>
  );
};

export default DashboardPage;
