// backend/src/modules/Ai/AdminChat/adminChatController.js

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import ApiError from "../../../utils/ApiError.js";
import { askPythonEngine } from "../ChatBot/AiService.js";
import { fetchAdminContext } from "./adminContextHandler.js";
import { parseAdminQuery } from "./adminIntentParser.js";
import { buildAdminPrompt } from "./adminPromptBuilder.js";

// ===============================
// 1. CONSTANTS
// ===============================
const DEFAULT_BAR_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
];
const TIME_TITLE_MAP = {
  today: "Hôm nay",
  yesterday: "Hôm qua",
  this_week: "Tuần này",
  last_week: "Tuần trước",
  next_week: "Tuần sau",
  this_month: "Tháng này",
  last_month: "Tháng trước",
  next_month: "Tháng sau",
};

// ===============================
// 2. HELPERS (KISS)
// ===============================

const getLastStatusFilterFromSession = (session) => {
  if (!session?.messages?.length) return null;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const { role, metadata } = session.messages[i];
    if (role !== "assistant" || !metadata) continue;
    try {
      const meta = JSON.parse(metadata);
      if (meta.statusFilter) return meta.statusFilter;
    } catch {
      if (/approved/i.test(metadata)) return "approved";
      if (/pending/i.test(metadata)) return "pending";
    }
  }
  return null;
};

const saveAndRespond = async (
  session,
  reply,
  chartData,
  res,
  extraMeta = {},
) => {
  session.messages.push({
    role: "assistant",
    content: [{ text: reply || "📊 Biểu đồ" }],
    metadata: JSON.stringify(
      chartData ? { chartData: true, ...extraMeta } : extraMeta,
    ),
  });
  await session.save();
  return res
    .status(StatusCodes.OK)
    .json({
      success: true,
      data: { sessionId: session.sessionId, reply, chartData },
    });
};

// ===============================
// 3. CHART BUILDERS
// ===============================

const buildAppointmentChart = (stats, timeRange) => {
  if (!stats) return null;
  return {
    bar: {
      type: "bar",
      title: `Thống kê lịch hẹn - ${TIME_TITLE_MAP[timeRange] || "toàn hệ thống"}`,
      data: [
        {
          name: "Hoàn thành",
          value: stats.completed || 0,
          color: DEFAULT_BAR_COLORS[0],
        },
        {
          name: "Đã xác nhận",
          value: stats.confirmed || 0,
          color: DEFAULT_BAR_COLORS[1],
        },
        {
          name: "Đã check-in",
          value: stats.checkedIn || 0,
          color: DEFAULT_BAR_COLORS[2],
        },
        {
          name: "Chờ thanh toán",
          value: stats.pendingPayment || 0,
          color: DEFAULT_BAR_COLORS[3],
        },
        {
          name: "Đã hủy",
          value: stats.cancelled || 0,
          color: DEFAULT_BAR_COLORS[4],
        },
      ],
      colors: DEFAULT_BAR_COLORS,
      valueLabel: "Số lượng",
    },
    pie: {
      type: "pie",
      title: "Tỷ lệ thanh toán",
      data: [
        { name: "Đã thanh toán", value: stats.paid || 0, color: "#10b981" },
        {
          name: "Chưa thanh toán/thất bại",
          value: stats.unpaidFailed || 0,
          color: "#ef4444",
        },
      ],
      colors: ["#10b981", "#ef4444"],
      valueLabel: "Số lượng",
    },
  };
};

const buildRevenueChart = (stats, isTotal = false, timeRange = null) => {
  if (!stats || stats.totalRevenue === 0) return null;
  const chart = {
    pie: {
      type: "pie",
      title: "Tỷ lệ thanh toán",
      data: [
        { name: "Online", value: stats.onlineRevenue, color: "#10b981" },
        { name: "Offline", value: stats.offlineRevenue, color: "#f59e0b" },
      ],
      colors: ["#10b981", "#f59e0b"],
    },
  };

  if (isTotal && stats.totalPlatformRevenue !== undefined) {
    chart.bar = {
      type: "bar",
      title: "Phân chia lợi nhuận",
      data: [
        {
          name: "Hệ thống",
          value: stats.totalPlatformRevenue,
          color: "#3b82f6",
        },
        {
          name: "Bệnh viện",
          value: stats.totalClinicRevenue,
          color: "#10b981",
        },
      ],
      colors: ["#3b82f6", "#10b981"],
      valueLabel: "Lợi nhuận (VNĐ)",
    };
  } else if (!isTotal && stats.dailyBreakdown?.length) {
    chart.bar = {
      type: "bar",
      title: `Doanh thu theo ngày - ${TIME_TITLE_MAP[timeRange] || timeRange?.toUpperCase() || ""}`,
      data: stats.dailyBreakdown.map((d) => ({
        name: d.date,
        value: d.totalRevenue,
        color: "#3b82f6",
      })),
      colors: ["#3b82f6"],
      valueLabel: "Doanh thu (VNĐ)",
    };
  }
  return chart;
};

const buildLineChart = (dailyRevenue, clinicName, month, year) => {
  if (!dailyRevenue?.length) return null;
  return {
    line: {
      type: "line",
      title: `📈 Doanh thu thực nhận - ${clinicName} - Tháng ${month}/${year}`,
      xAxis: {
        label: "Ngày",
        categories: dailyRevenue.map((d) => `${d.date.split("-")[2]}/${month}`),
      },
      yAxis: { label: "Doanh thu (VNĐ)", suffix: " VNĐ" },
      series: [
        {
          name: "Doanh thu phòng khám",
          data: dailyRevenue.map((d) => d.revenue),
          color: "#3b82f6",
          lineTension: 0.2,
          pointRadius: 3,
        },
      ],
    },
  };
};

const buildTopDoctorsLineChart = (topDoctors) => {
  if (!topDoctors?.length) return null;
  return {
    line: {
      type: "line",
      title: `📈 Top ${topDoctors.length} Bác sĩ có lịch hẹn hoàn thành nhiều nhất`,
      xAxis: {
        label: "Bác sĩ",
        categories: topDoctors.map((d) => `BS. ${d.doctorName}`), // Trục X là Tên Bác Sĩ
      },
      yAxis: { label: "Số lượng ca khám (ca)", suffix: " ca" },
      series: [
        {
          name: "Số ca hoàn thành",
          data: topDoctors.map((d) => d.completedCount), // Trục Y là số ca
          color: "#8b5cf6", // Màu tím phân biệt với doanh thu
          lineTension: 0.3,
          pointRadius: 4,
        },
      ],
    },
  };
};

// ===============================
// 4. CORE HANDLERS
// ===============================

const handleCharts = async (session, context, parsed, res) => {
  const { intent, timeRange } = parsed;
  const { stats, dailyRevenue, clinic, month, year, topDoctors } = context;
  let reply = "",
    chartData = null;

  if (intent.includes("appointment_stats")) {
    chartData = buildAppointmentChart(stats, timeRange);
    reply = "📊 Biểu đồ thống kê lịch hẹn";
  } else if (intent.includes("revenue_stats")) {
    const isTotal = intent === "total_revenue_stats";
    console.log(
      `[DEBUG][RevenueStats][Controller] Bắt đầu vẽ Chart Doanh thu. Loại: ${isTotal ? "Tổng thể" : "Theo thời gian"}. Tổng tiền: ${stats?.totalRevenue || 0}`,
    );

    if (stats?.totalRevenue > 0) {
      chartData = buildRevenueChart(stats, isTotal, timeRange);
      console.log(
        `[DEBUG][RevenueStats][Controller] Khởi tạo thành công JSON Chart Data (Pie/Bar) cho doanh thu.`,
      );
    } else {
      console.log(
        `[DEBUG][RevenueStats][Controller] Tổng doanh thu = 0 -> Fallback sang Text Reply. Không vẽ Chart.`,
      );
      reply = `📊 **Thống kê doanh thu ${isTotal ? "toàn hệ thống" : `- ${TIME_TITLE_MAP[timeRange] || timeRange?.toUpperCase() || "Khoảng thời gian"}`}**\n\nKhông có giao dịch nào.`;
    }
  } else if (intent === "clinic_revenue_by_month") {
    console.log(
      `[DEBUG][ClinicRevenue][Controller] Bắt đầu vẽ Chart Doanh thu phòng khám. Phòng khám: ${clinic.name}, Tháng: ${month}, Năm: ${year}`,
    );
    if (!dailyRevenue?.length || dailyRevenue.every((d) => d.revenue === 0)) {
      reply = `🏥 **${clinic.name}** chưa có doanh thu nào trong tháng ${month}/${year}.`;
    } else {
      chartData = buildLineChart(dailyRevenue, clinic.name, month, year);
      reply = `📊 Biểu đồ doanh thu theo ngày của **${clinic.name}** tháng ${month}/${year}.`;
    }
  } else if (intent === "top_doctors_completed_appointments") {
    console.log(
      `[DEBUG][TopDoctors][Controller] Đang xử lý Chart cho intent top_doctors... Kiểm tra mảng topDoctors:`,
      !!topDoctors?.length,
    );
    if (!topDoctors?.length) {
      console.log(
        `[DEBUG][TopDoctors][Controller] Mảng rỗng -> Fallback sang Text Reply. Bỏ qua vẽ Chart.`,
      );
      reply = `Dạ, hiện tại hệ thống chưa ghi nhận bác sĩ nào có lịch khám ở trạng thái hoàn thành ạ.`;
    } else {
      console.log(
        `[DEBUG][TopDoctors][Controller] Dữ liệu chuẩn -> Tiến hành buildLineChart cho ${topDoctors.length} elements.`,
      );
      chartData = buildTopDoctorsLineChart(topDoctors);
      reply = `📊 Biểu đồ thống kê Top bác sĩ có lượng ca khám hoàn thành cao nhất.`;
    }
  }

  return saveAndRespond(session, reply, chartData, res);
};

const handleAI = async (session, context, parsed, res) => {
  const payload = [
    { role: "system", content: [{ text: buildAdminPrompt(context) }] },
    ...session.messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const raw = await askPythonEngine(payload);
    let reply = raw,
      state = "";
    try {
      const parsedAI = JSON.parse(raw);
      reply = parsedAI.reply || raw;
      state = parsedAI.state_summary || "";
    } catch {}

    const meta = {
      intent: parsed.intent,
      ...(context.statusFilter && { statusFilter: context.statusFilter }),
      ...(context.count && { count: context.count }),
      ...(state && { state }),
    };

    return saveAndRespond(session, reply, null, res, meta);
  } catch (error) {
    console.error("[AdminChat] AI Engine Error:", error.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Hệ thống AI đang bận, vui lòng thử lại sau.",
    );
  }
};

// ===============================
// 5. MAIN CONTROLLER
// ===============================

export const processAdminChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message?.trim())
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Thiếu sessionId hoặc nội dung tin nhắn.",
    );

  let session =
    (await ChatSession.findOne({ sessionId })) ||
    new ChatSession({ sessionId, messages: [] });
  if (req.user?._id && !session.user) session.user = req.user._id;

  session.messages.push({ role: "user", content: [{ text: message }] });

  const inheritedStatus = getLastStatusFilterFromSession(session);
  const parsed = parseAdminQuery(message, inheritedStatus);
  const context = await fetchAdminContext(parsed, inheritedStatus);

  const isChartIntent = [
    "total_appointment_stats",
    "appointment_stats_by_time",
    "revenue_stats_by_time",
    "total_revenue_stats",
    "clinic_revenue_by_month",
    "top_doctors_completed_appointments",
  ].includes(parsed.intent);

  if (
    isChartIntent &&
    (context.stats || parsed.intent === "clinic_revenue_by_month" || parsed.intent === "top_doctors_completed_appointments")
  ) {
    return await handleCharts(session, context, parsed, res);
  }
  return await handleAI(session, context, parsed, res);
});
