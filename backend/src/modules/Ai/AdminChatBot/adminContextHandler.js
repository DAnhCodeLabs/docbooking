// backend/src/modules/Ai/AdminChat/adminContextHandler.js

// ===============================
// 1. IMPORTS
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
  getTopDoctorsCompletedAppointments,
} from "./adminDataService.js";

// ===============================
// 2. HELPERS (KISS & DRY)
// ===============================

const dbErrorResult = (intent, errorMsg = "DB_QUERY_FAILED") => ({
  intent,
  error: errorMsg,
  data: null,
});

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
// 3. INTENT HANDLERS (Core Logic)
// ===============================

const handlers = {
  list_doctors_by_specialty: async ({ specialtyName }, statusFilter) => {
    if (!specialtyName)
      return {
        intent: "list_doctors_by_specialty",
        error: "MISSING_SPECIALTY_NAME",
        data: null,
      };
    const specialty = await findSpecialtyByName(specialtyName);
    if (!specialty)
      return specialtyNotFoundResult(
        "list_doctors_by_specialty",
        specialtyName,
      );

    const doctors = await getDoctorsBySpecialty(specialty._id, statusFilter);
    return {
      intent: "list_doctors_by_specialty",
      specialty: { id: specialty._id, name: specialty.name },
      doctors,
      count: doctors.length,
      statusFilter,
      data: {
        specialtyName: specialty.name,
        doctors,
        count: doctors.length,
        statusFilter,
      },
    };
  },

  count_doctors_by_approval_status: async ({ statusType }) => {
    const statusesArr =
      statusType === "pending"
        ? ["pending", "pending_admin_approval"]
        : ["active"];
    const statusLabel = statusType === "pending" ? "chưa duyệt" : "đã duyệt";
    const count = await getDoctorCountByStatus(statusesArr);

    return {
      intent: "count_doctors_by_approval_status",
      statusType,
      statusLabel,
      count,
      statusFilter: statusType,
      data: { count, statusLabel, statusFilter: statusType },
    };
  },

  list_doctors_by_clinic: async ({ clinicName }, statusFilter) => {
    if (!clinicName)
      return {
        intent: "list_doctors_by_clinic",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    const clinic = await findClinicByName(clinicName);
    if (!clinic)
      return clinicNotFoundResult("list_doctors_by_clinic", clinicName);

    const doctors = await getDoctorsByClinic(clinic._id, statusFilter);
    return {
      intent: "list_doctors_by_clinic",
      clinic: {
        id: clinic._id,
        name: clinic.clinicName,
        address: clinic.address,
      },
      doctors,
      count: doctors.length,
      statusFilter,
      data: {
        clinicName: clinic.clinicName,
        doctors,
        count: doctors.length,
        statusFilter,
      },
    };
  },

  list_clinics_by_approval_status: async ({ statuses, statusLabel }) => {
    if (!statuses?.length)
      return {
        intent: "list_clinics_by_approval_status",
        error: "MISSING_STATUS",
        data: null,
      };
    const clinics = await getClinicsByStatus(statuses);
    return {
      intent: "list_clinics_by_approval_status",
      clinics: clinics.map((c) => ({ id: c._id, name: c.clinicName })),
      count: clinics.length,
      statusFilter: statuses,
      statusLabel,
      data: { clinics, count: clinics.length, statusLabel },
    };
  },

  get_clinic_details: async ({ clinicName }) => {
    if (!clinicName || clinicName.length < 2)
      return {
        intent: "get_clinic_details",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    const clinicDetail = await getClinicDetails(clinicName);
    if (!clinicDetail)
      return clinicNotFoundResult("get_clinic_details", clinicName);
    return {
      intent: "get_clinic_details",
      clinic: clinicDetail,
      data: { clinic: clinicDetail },
    };
  },

  total_appointment_stats: async () => {
    const stats = await getTotalAppointmentStats();
    return { intent: "total_appointment_stats", stats, data: stats };
  },

  appointment_stats_by_time: async ({ timeRange }) => {
    if (!timeRange)
      return {
        intent: "appointment_stats_by_time",
        error: "MISSING_TIME_RANGE",
        data: null,
      };
    const range = getDateRange(timeRange);
    if (!range)
      return {
        intent: "appointment_stats_by_time",
        error: "INVALID_TIME_RANGE",
        data: null,
      };

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
  },

  total_revenue_stats: async () => {
    console.log(
      `[DEBUG][RevenueStats][ContextHandler] Bắt đầu gọi getTotalRevenueStats() để lấy thống kê tổng.`,
    );
    const stats = await getTotalRevenueStats();
    console.log(
      `[DEBUG][RevenueStats][ContextHandler] Lấy thành công. Nền tảng: ${stats.totalPlatformRevenue}, Bệnh viện: ${stats.totalClinicRevenue}`,
    );
    return { intent: "total_revenue_stats", stats, data: stats };
  },

  revenue_stats_by_time: async ({ timeRange }) => {
    if (!timeRange)
      return {
        intent: "revenue_stats_by_time",
        error: "MISSING_TIME_RANGE",
        data: null,
      };
    const range = getDateRange(timeRange);
    if (!range)
      return {
        intent: "revenue_stats_by_time",
        error: "INVALID_TIME_RANGE",
        data: null,
      };

    const needBreakdown = timeRange !== "today" && timeRange !== "yesterday";
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
  },

  clinic_revenue_by_month: async ({ clinicName, month, year, monthOffset }) => {
    if (!clinicName)
      return {
        intent: "clinic_revenue_by_month",
        error: "MISSING_CLINIC_NAME",
        data: null,
      };
    const clinic = await findClinicByName(clinicName);
    if (!clinic)
      return clinicNotFoundResult("clinic_revenue_by_month", clinicName);

    let range;
    if (month && year) range = getSpecificMonthRange(year, month);
    else if (monthOffset !== undefined) range = getMonthLocalRange(monthOffset);
    else
      return {
        intent: "clinic_revenue_by_month",
        error: "MISSING_DATE_RANGE",
        data: null,
      };

    const dailyRevenue = await getClinicDailyRevenue(
      clinic._id,
      range.startUTC,
      range.endUTC,
    );

    // Tối ưu hóa việc map doanh thu theo ngày
    const dateMap = new Map(
      dailyRevenue.map((item) => [item.date, item.revenue]),
    );
    const daysInMonth = dayjs(range.startUTC).daysInMonth();
    const startD = new Date(range.startUTC);
    const derivedYear = year || startD.getUTCFullYear();
    const derivedMonth = month || startD.getUTCMonth() + 1;

    const filledData = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${derivedYear}-${String(derivedMonth).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return { date: dateStr, revenue: dateMap.get(dateStr) || 0 };
    });

    return {
      intent: "clinic_revenue_by_month",
      clinic: { id: clinic._id, name: clinic.clinicName },
      dailyRevenue: filledData,
      month: derivedMonth,
      year: derivedYear,
      data: { clinicName: clinic.clinicName, dailyRevenue: filledData },
    };
  },

  top_doctors_completed_appointments: async () => {
    console.log(
      `[DEBUG][TopDoctors][ContextHandler] Bắt đầu gọi DataService để lấy dữ liệu`,
    );
    const topDoctors = await getTopDoctorsCompletedAppointments(5);
    console.log(
      `[DEBUG][TopDoctors][ContextHandler] Đóng gói thành công. Payload size: ${topDoctors?.length || 0}`,
    );
    return {
      intent: "top_doctors_completed_appointments",
      topDoctors,
      data: { topDoctors },
    };
  },
};

// ===============================
// 4. MAIN EXPORT FUNCTION
// ===============================

export const fetchAdminContext = async (parsed, inheritedStatus = null) => {
  const { intent, requiresClarification, clarificationMessage, statusFilter } =
    parsed;

  if (requiresClarification) {
    return {
      intent,
      requiresClarification: true,
      clarificationMessage,
      data: null,
    };
  }

  const handler = handlers[intent];
  if (!handler) return { intent: "unknown", data: null };

  const effectiveStatus = statusFilter || inheritedStatus || "approved";

  try {
    return await handler(parsed, effectiveStatus);
  } catch (error) {
    console.error(`[fetchAdminContext] ${intent} error:`, error.message);
    return dbErrorResult(intent);
  }
};
