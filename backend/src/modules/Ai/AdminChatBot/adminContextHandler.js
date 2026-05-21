// backend/src/modules/Ai/AdminChat/adminContextHandler.js

// ===============================
// 1. IMPORTS (giữ nguyên)
// ===============================
import ClinicLead from "../../../models/ClinicLead.js";
import Specialty from "../../../models/Specialty.js";
import dayjs from "dayjs";
import {
  getMonthLocalRange,
  getSpecificMonthRange,
  getTodayLocalRange,
  getWeekLocalRange,
  getYesterdayLocalRange,
} from "../../../utils/date.js";
import {
  findClinicByName,
  findSpecialtyByName,
  getAppointmentStatsByDateRange,
  getClinicDailyRevenue,
  getClinicDetails,
  getClinicsByStatus,
  getDoctorCountByStatus,
  getDoctorsByClinic,
  getDoctorsBySpecialty,
  getRevenueStatsByDateRange,
  getTotalAppointmentStats,
  getTotalRevenueStats,
} from "./adminDataService.js";

// ===============================
// 2. HELPERS (DRY)
// ===============================

/**
 * Xử lý lỗi chung cho DB query
 */
const dbErrorResult = (intent, errorMsg = "DB_QUERY_FAILED") => ({
  intent,
  error: errorMsg,
  data: null,
});

/**
 * Xử lý case không tìm thấy specialty
 */
const specialtyNotFoundResult = async (intent, queryName) => {
  const suggestions = await Specialty.find({ status: "active" })
    .limit(5)
    .select("name")
    .lean();
  return {
    intent,
    error: "SPECIALTY_NOT_FOUND",
    querySpecialty: queryName,
    suggestions: suggestions.map((s) => s.name),
    data: null,
  };
};

/**
 * Xử lý case không tìm thấy clinic
 */
const clinicNotFoundResult = async (intent, queryName) => {
  const suggestions = await ClinicLead.find({
    status: { $in: ["resolved", "contacted"] },
  })
    .limit(5)
    .select("clinicName")
    .lean();
  return {
    intent,
    error: "CLINIC_NOT_FOUND",
    queryClinic: queryName,
    suggestions: suggestions.map((c) => c.clinicName),
    data: null,
  };
};

/**
 * Chuyển đổi timeRange string sang date range object
 */
const getDateRange = (timeRange) => {
  switch (timeRange) {
    case "today":
      return getTodayLocalRange();
    case "yesterday":
      return getYesterdayLocalRange();
    case "this_week":
      return getWeekLocalRange(0);
    case "last_week":
      return getWeekLocalRange(-1);
    case "next_week":
      return getWeekLocalRange(1);
    case "this_month":
      return getMonthLocalRange(0);
    case "last_month":
      return getMonthLocalRange(-1);
    case "next_month":
      return getMonthLocalRange(1);
    default:
      return null;
  }
};

// ===============================
// 3. INTENT HANDLERS
// ===============================

const handlers = {
  // ---------- Danh sách bác sĩ theo chuyên khoa ----------
  list_doctors_by_specialty: async (parsed, effectiveStatus) => {
    const { specialtyName } = parsed;
    if (!specialtyName) {
      return {
        intent: "list_doctors_by_specialty",
        error: "MISSING_SPECIALTY_NAME",
        data: null,
      };
    }
    const specialty = await findSpecialtyByName(specialtyName);
    if (!specialty) {
      return await specialtyNotFoundResult(
        "list_doctors_by_specialty",
        specialtyName,
      );
    }
    const doctors = await getDoctorsBySpecialty(specialty._id, effectiveStatus);
    return {
      intent: "list_doctors_by_specialty",
      specialty: { id: specialty._id, name: specialty.name },
      doctors,
      count: doctors.length,
      statusFilter: effectiveStatus,
      data: {
        specialtyName: specialty.name,
        doctors,
        count: doctors.length,
        statusFilter: effectiveStatus,
      },
    };
  },

  // ---------- Đếm bác sĩ theo trạng thái duyệt ----------
  count_doctors_by_approval_status: async (parsed) => {
    const { statusType } = parsed;
    const isPending = statusType === "pending";
    const statusesArr = isPending
      ? ["pending", "pending_admin_approval"]
      : ["active"];
    const statusLabelText = isPending ? "chưa duyệt" : "đã duyệt";
    try {
      const count = await getDoctorCountByStatus(statusesArr);
      return {
        intent: "count_doctors_by_approval_status",
        statusType,
        statusLabel: statusLabelText,
        count,
        statusFilter: statusType,
        data: { count, statusLabel: statusLabelText, statusFilter: statusType },
      };
    } catch {
      return dbErrorResult("count_doctors_by_approval_status");
    }
  },

  // ---------- Danh sách bác sĩ theo phòng khám ----------
  list_doctors_by_clinic: async (parsed, effectiveStatus) => {
    const { clinicName } = parsed;
    if (!clinicName) {
      return {
        intent: "list_doctors_by_clinic",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    }
    const clinic = await findClinicByName(clinicName);
    if (!clinic) {
      return await clinicNotFoundResult("list_doctors_by_clinic", clinicName);
    }
    const doctors = await getDoctorsByClinic(clinic._id, effectiveStatus);
    return {
      intent: "list_doctors_by_clinic",
      clinic: {
        id: clinic._id,
        name: clinic.clinicName,
        address: clinic.address,
      },
      doctors,
      count: doctors.length,
      statusFilter: effectiveStatus,
      data: {
        clinicName: clinic.clinicName,
        doctors,
        count: doctors.length,
        statusFilter: effectiveStatus,
      },
    };
  },

  // ---------- Danh sách phòng khám theo trạng thái ----------
  list_clinics_by_approval_status: async (parsed) => {
    const { statuses, statusLabel } = parsed;
    if (!statuses || statuses.length === 0) {
      return {
        intent: "list_clinics_by_approval_status",
        error: "MISSING_STATUS",
        data: null,
      };
    }
    try {
      const clinics = await getClinicsByStatus(statuses);
      const count = clinics.length;
      return {
        intent: "list_clinics_by_approval_status",
        clinics: clinics.map((c) => ({ id: c._id, name: c.clinicName })),
        count,
        statusFilter: statuses,
        statusLabel,
        data: { clinics, count, statusLabel },
      };
    } catch {
      return dbErrorResult("list_clinics_by_approval_status");
    }
  },

  // ---------- Chi tiết phòng khám ----------
  get_clinic_details: async (parsed) => {
    const { clinicName } = parsed;
    if (!clinicName || clinicName.length < 2) {
      return {
        intent: "get_clinic_details",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    }
    try {
      const clinicDetail = await getClinicDetails(clinicName);
      if (!clinicDetail) {
        return await clinicNotFoundResult("get_clinic_details", clinicName);
      }
      return {
        intent: "get_clinic_details",
        clinic: clinicDetail,
        data: { clinic: clinicDetail },
      };
    } catch {
      return dbErrorResult("get_clinic_details");
    }
  },

  // ---------- Thống kê tổng lịch hẹn ----------
  total_appointment_stats: async () => {
    try {
      const stats = await getTotalAppointmentStats();
      return { intent: "total_appointment_stats", stats, data: stats };
    } catch {
      return dbErrorResult("total_appointment_stats");
    }
  },

  // ---------- Thống kê lịch hẹn theo thời gian ----------
  appointment_stats_by_time: async (parsed) => {
    const { timeRange } = parsed;
    if (!timeRange) {
      return {
        intent: "appointment_stats_by_time",
        error: "MISSING_TIME_RANGE",
        data: null,
      };
    }
    const range = getDateRange(timeRange);
    if (!range) {
      return {
        intent: "appointment_stats_by_time",
        error: "INVALID_TIME_RANGE",
        data: null,
      };
    }
    try {
      const stats = await getAppointmentStatsByDateRange(
        range.startUTC,
        range.endUTC,
      );
      return {
        intent: "appointment_stats_by_time",
        timeRange,
        stats,
        data: { stats, timeRange, range },
      };
    } catch {
      return dbErrorResult("appointment_stats_by_time");
    }
  },

  // ---------- Thống kê tổng doanh thu ----------
  total_revenue_stats: async () => {
    try {
      const stats = await getTotalRevenueStats();
      return { intent: "total_revenue_stats", stats, data: stats };
    } catch {
      return dbErrorResult("total_revenue_stats");
    }
  },

  // ---------- Thống kê doanh thu theo thời gian ----------
  revenue_stats_by_time: async (parsed) => {
    const { timeRange } = parsed;
    if (!timeRange) {
      return {
        intent: "revenue_stats_by_time",
        error: "MISSING_TIME_RANGE",
        data: null,
      };
    }
    const range = getDateRange(timeRange);
    if (!range) {
      return {
        intent: "revenue_stats_by_time",
        error: "INVALID_TIME_RANGE",
        data: null,
      };
    }
    const needBreakdown = !["today", "yesterday"].includes(timeRange);
    try {
      const stats = await getRevenueStatsByDateRange(
        range.startUTC,
        range.endUTC,
        needBreakdown,
      );
      return {
        intent: "revenue_stats_by_time",
        timeRange,
        stats,
        data: { stats, timeRange, range },
      };
    } catch {
      return dbErrorResult("revenue_stats_by_time");
    }
  },

  // ---------- Doanh thu phòng khám theo tháng (chi tiết từng ngày) ----------
  clinic_revenue_by_month: async (parsed) => {
    console.log(
      `[DEBUG][Context] Starting clinic_revenue_by_month handler with parsed:`,
      parsed,
    );
    const { clinicName, month, year, monthOffset } = parsed;
    if (!clinicName) {
      return {
        intent: "clinic_revenue_by_month",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    }
    // Tìm clinic (fuzzy)
    const clinic = await findClinicByName(clinicName);
    if (!clinic) {
      console.warn(`[DEBUG][Context] Clinic not found: "${clinicName}"`);
      return await clinicNotFoundResult("clinic_revenue_by_month", clinicName);
    }
    console.log(
      `[DEBUG][Context] Found clinic: id=${clinic._id}, name=${clinic.clinicName}`,
    );
    // Xác định khoảng thời gian
    let startUTC, endUTC;
    if (month && year) {
      const range = getSpecificMonthRange(year, month);
      startUTC = range.startUTC;
      endUTC = range.endUTC;
      console.log(
        `[DEBUG][Context] Specific month range: ${startUTC.toISOString()} -> ${endUTC.toISOString()}`,
      );
    } else if (monthOffset !== undefined) {
      const range = getMonthLocalRange(monthOffset);
      startUTC = range.startUTC;
      endUTC = range.endUTC;
      console.log(
        `[DEBUG][Context] Relative month offset ${monthOffset}: ${startUTC.toISOString()} -> ${endUTC.toISOString()}`,
      );
    } else {
      return {
        intent: "clinic_revenue_by_month",
        error: "MISSING_DATE_RANGE",
        data: null,
      };
    }
    // Lấy dữ liệu daily revenue
    const dailyRevenue = await getClinicDailyRevenue(
      clinic._id,
      startUTC,
      endUTC,
    );
    console.log(
      `[DEBUG][Context] Raw dailyRevenue (${dailyRevenue.length} entries):`,
      dailyRevenue,
    );
    // Tạo mảng 30/31 ngày với giá trị 0 cho ngày không có giao dịch
    const dateMap = new Map();
    dailyRevenue.forEach((item) => dateMap.set(item.date, item.revenue));
    const daysInMonth = dayjs(startUTC).daysInMonth();
     console.log(`[DEBUG][Context] Days in month: ${daysInMonth}`);
    const filledData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year || new Date(startUTC).getUTCFullYear()}-${String(month || new Date(startUTC).getUTCMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      filledData.push({
        date: dateStr,
        revenue: dateMap.get(dateStr) || 0,
      });
    }
    console.log(
      `[DEBUG][Context] Final filled data (${filledData.length} days), total revenue: ${filledData.reduce((s, d) => s + d.revenue, 0)}`,
    );
    return {
      intent: "clinic_revenue_by_month",
      clinic: { id: clinic._id, name: clinic.clinicName },
      dailyRevenue: filledData,
      month: month || new Date(startUTC).getUTCMonth() + 1,
      year: year || new Date(startUTC).getUTCFullYear(),
      data: { clinicName: clinic.clinicName, dailyRevenue: filledData },
    };
  },
};

// ===============================
// 4. MAIN EXPORT FUNCTION
// ===============================

export const fetchAdminContext = async (parsed, inheritedStatus = null) => {
  const { intent, requiresClarification, clarificationMessage } = parsed;

  // Ưu tiên làm rõ nếu cần
  if (requiresClarification) {
    return {
      intent,
      requiresClarification: true,
      clarificationMessage,
      data: null,
    };
  }

  const effectiveStatus = parsed.statusFilter || inheritedStatus || "approved";
  const handler = handlers[intent];

  if (!handler) {
    return { intent: "unknown", data: null };
  }

  try {
    return await handler(parsed, effectiveStatus);
  } catch (error) {
    console.error(`[fetchAdminContext] ${intent} error:`, error.message);
    return dbErrorResult(intent);
  }
};
