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
// 2. HELPERS (DRY)
// ===============================

/**
 * Lấy status filter từ session metadata (text hoặc JSON)
 */
const getLastStatusFilterFromSession = (session) => {
  if (!session?.messages?.length) return null;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if (msg.role !== "assistant" || !msg.metadata) continue;
    try {
      const meta = JSON.parse(msg.metadata);
      if (meta.statusFilter) return meta.statusFilter;
    } catch {
      if (/approved/i.test(msg.metadata)) return "approved";
      if (/pending/i.test(msg.metadata)) return "pending";
    }
  }
  return null;
};

/**
 * Lưu tin nhắn assistant và gửi response JSON (tái sử dụng cho nhiều handler)
 */
const saveAndRespond = async (session, reply, chartData, res) => {
  console.log(
    `[DEBUG][Controller] saveAndRespond: sessionId=${session.sessionId}, reply length=${reply?.length}, hasChart=${!!chartData}`,
  );
  session.messages.push({
    role: "assistant",
    content: [{ text: reply || "📊 Biểu đồ" }],
    metadata: JSON.stringify({ chartData: !!chartData }),
  });
  await session.save();
  console.log(
    `[DEBUG][Controller] Session saved, messages count=${session.messages.length}`,
  );
  return res.status(StatusCodes.OK).json({
    success: true,
    data: { sessionId: session.sessionId, reply, chartData },
  });
};

/**
 * Format số với locale VN
 */
const formatNumber = (num) => num?.toLocaleString("vi-VN") ?? "0";

// ===============================
// 3. CHART BUILDERS (giữ nguyên output)
// ===============================

const buildAppointmentChart = (stats, timeRange) => {
  if (!stats) return null;
  const title = `Thống kê lịch hẹn - ${TIME_TITLE_MAP[timeRange] || "toàn hệ thống"}`;
  return {
    bar: {
      type: "bar",
      title,
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
  const displayTime =
    TIME_TITLE_MAP[timeRange] || timeRange?.toUpperCase() || "";
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
  if (
    isTotal &&
    stats.totalPlatformRevenue !== undefined &&
    stats.totalClinicRevenue !== undefined
  ) {
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
  }
  if (!isTotal && stats.dailyBreakdown?.length) {
    chart.bar = {
      type: "bar",
      title: `Doanh thu theo ngày - ${displayTime}`,
      data: stats.dailyBreakdown.map((day) => ({
        name: day.date,
        value: day.totalRevenue,
        color: "#3b82f6",
      })),
      colors: ["#3b82f6"],
      valueLabel: "Doanh thu (VNĐ)",
    };
  }
  return chart;
};

/**
 * Xây dựng biểu đồ đường (line chart) cho doanh thu theo ngày
 */
const buildLineChart = (dailyRevenue, clinicName, month, year) => {
  if (!dailyRevenue || dailyRevenue.length === 0) return null;
  const categories = dailyRevenue.map((item) => {
    const d = item.date.split("-")[2];
    return `${d}/${month}`;
  });
  const seriesData = dailyRevenue.map((item) => item.revenue);
  return {
    line: {
      type: "line",
      title: `📈 Doanh thu thực nhận - ${clinicName} - Tháng ${month}/${year}`,
      xAxis: {
        label: "Ngày",
        categories: categories,
      },
      yAxis: {
        label: "Doanh thu (VNĐ)",
        suffix: " VNĐ",
      },
      series: [
        {
          name: "Doanh thu phòng khám",
          data: seriesData,
          color: "#3b82f6",
          lineTension: 0.2,
          pointRadius: 3,
        },
      ],
    },
  };
};

// Handler mới cho intent clinic_revenue_by_month
const handleClinicRevenueByMonth = async (session, context, parsed, res) => {
  console.log(
    `[DEBUG][Controller] Handling clinic_revenue_by_month for session ${session.sessionId}`,
  );
  const { dailyRevenue, clinic, month, year } = context;
  console.log(
    `[DEBUG][Controller] Clinic: ${clinic.name}, month=${month}, year=${year}, dailyRevenue length=${dailyRevenue?.length}`,
  );
  if (
    !dailyRevenue ||
    dailyRevenue.length === 0 ||
    dailyRevenue.every((d) => d.revenue === 0)
  ) {
    console.log(`[DEBUG][Controller] No revenue data → text response`);
    const reply = `🏥 **${clinic.name}** chưa có doanh thu nào trong tháng ${month}/${year}.`;
    await saveAndRespond(session, reply, null, res);
    return;
  }
  const total = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  console.log(
    `[DEBUG][Controller] Total revenue in month: ${total} VNĐ. Generating line chart.`,
  );
  const chartData = buildLineChart(dailyRevenue, clinic.name, month, year);
  await saveAndRespond(
    session,
    `📊 Biểu đồ doanh thu theo ngày của **${clinic.name}** tháng ${month}/${year}.`,
    chartData,
    res,
  );
  console.log(
    `[DEBUG][Controller] Response sent with chartData keys:`,
    Object.keys(chartData || {}),
  );
};

// ===============================
// 4. INTENT HANDLERS
// ===============================

const handleAppointmentStats = async (session, context, parsed, res) => {
  const chartData = buildAppointmentChart(context.stats, parsed.timeRange);
  await saveAndRespond(session, "📊 Biểu đồ thống kê lịch hẹn", chartData, res);
};

const handleRevenueStatsByTime = async (session, context, parsed, res) => {
  const stats = context.stats;
  const hasData = stats.totalRevenue > 0;
  let reply = "",
    chartData = null;
  if (hasData) {
    chartData = buildRevenueChart(stats, false, context.timeRange);
  } else {
    reply = `📊 **Thống kê doanh thu - ${context.timeRange?.toUpperCase() || "Khoảng thời gian"}**\n\nKhông có giao dịch nào.`;
  }
  await saveAndRespond(session, reply, chartData, res);
};

const handleTotalRevenueStats = async (session, context, parsed, res) => {
  const stats = context.stats;
  const hasData = stats.totalRevenue > 0;
  let reply = "",
    chartData = null;
  if (hasData) {
    chartData = buildRevenueChart(stats, true);
  } else {
    reply =
      "📊 **Thống kê doanh thu toàn hệ thống**\n\nKhông có giao dịch nào.";
  }
  await saveAndRespond(session, reply, chartData, res);
};

const handleAI = async (session, context, parsed, res) => {
  const systemPrompt = buildAdminPrompt(context);
  const payload = [
    { role: "system", content: [{ text: systemPrompt }] },
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
    session.messages.push({
      role: "assistant",
      content: [{ text: reply }],
      metadata: JSON.stringify(meta),
    });
    await session.save();
    return res.status(StatusCodes.OK).json({
      success: true,
      data: { sessionId: session.sessionId, reply, chartData: null },
    });
  } catch (error) {
    console.error("[AdminChat] AI Engine Error:", error.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Hệ thống AI đang bận, vui lòng thử lại sau.",
    );
  }
};

// Mapping intent → handler (dùng thay cho switch-case)
const INTENT_HANDLERS = {
  total_appointment_stats: handleAppointmentStats,
  appointment_stats_by_time: handleAppointmentStats,
  revenue_stats_by_time: handleRevenueStatsByTime,
  total_revenue_stats: handleTotalRevenueStats,
  clinic_revenue_by_month: handleClinicRevenueByMonth,
};

// ===============================
// 5. MAIN CONTROLLER
// ===============================

export const processAdminChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message?.trim()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Thiếu sessionId hoặc nội dung tin nhắn.",
    );
  }

  let session = await ChatSession.findOne({ sessionId });
  if (!session) session = new ChatSession({ sessionId, messages: [] });
  if (req.user?._id && !session.user) session.user = req.user._id;

  session.messages.push({ role: "user", content: [{ text: message }] });

  const inheritedStatus = getLastStatusFilterFromSession(session);
  const parsed = parseAdminQuery(message, inheritedStatus);
  const context = await fetchAdminContext(parsed, inheritedStatus);

  // Nếu intent có stats và có handler riêng (biểu đồ) → gọi, else fallback AI
  const handler = INTENT_HANDLERS[parsed.intent];
  if (
    handler &&
    (context.stats || parsed.intent === "clinic_revenue_by_month")
  ) {
    return await handler(session, context, parsed, res);
  }
  return await handleAI(session, context, parsed, res);
});
