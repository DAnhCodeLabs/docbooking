// backend/src/modules/Ai/AdminChat/adminDataService.js

// ===============================
// 1. IMPORTS
// ===============================
import Appointment from "../../../models/Appointment.js";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Payment from "../../../models/Payment.js";
import RevenueSplit from "../../../models/RevenueSplit.js";
import Specialty from "../../../models/Specialty.js";

// ===============================
// 2. HELPER FUNCTIONS (DRY)
// ===============================

/**
 * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu, lowercase, chỉ giữ a-z0-9 và khoảng trắng)
 */
const normalizeVietnamese = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
};

/**
 * Tìm kiếm mờ (fuzzy) trong danh sách các document dựa trên tên (fieldName mặc định "name" hoặc "clinicName")
 * Trả về document khớp nhất hoặc null.
 */
const fuzzyFindByName = (items, queryName, fieldName = "name") => {
  if (!queryName || queryName.length < 2 || !items.length) return null;

  const normalizedQuery = normalizeVietnamese(queryName);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  let bestMatch = null;
  let maxRatio = 0;

  for (const item of items) {
    const itemName = item[fieldName];
    const normalizedItem = normalizeVietnamese(itemName);
    const matched = queryWords.reduce(
      (count, w) => count + (normalizedItem.includes(w) ? 1 : 0),
      0,
    );
    const ratio = matched / queryWords.length;
    if (ratio >= 0.6 && ratio > maxRatio) {
      maxRatio = ratio;
      bestMatch = item;
    }
  }
  return bestMatch;
};

/**
 * Map statusFilter (approved/pending) sang mảng status trong DB
 */
const getDoctorStatuses = (statusFilter) => {
  if (statusFilter === "approved") return ["active"];
  if (statusFilter === "pending") return ["pending", "pending_admin_approval"];
  return ["active"]; // fallback
};

/**
 * Format một doctor object thành output chuẩn
 */
const formatDoctorOutput = (doc) => ({
  id: doc._id,
  fullName: doc.user?.fullName || null,
  experience: doc.experience,
  consultationFee: doc.consultationFee,
  totalReviews: doc.totalReviews,
  clinicName: doc.clinicId?.clinicName || null,
  clinicAddress: doc.clinicId?.address || null,
});

// ===============================
// 3. EXPORTED FUNCTIONS (giữ nguyên tên, tham số, output)
// ===============================

// ----- Tìm kiếm chuyên khoa (chính xác trước, sau đó fuzzy) -----
export const findSpecialtyByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // exact match
  const exactMatch = await Specialty.findOne({
    name: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "active",
  }).lean();
  if (exactMatch) return exactMatch;

  // fuzzy match
  const allSpecialties = await Specialty.find({ status: "active" })
    .select("name")
    .lean();
  return fuzzyFindByName(allSpecialties, queryName, "name");
};

// ----- Lấy danh sách bác sĩ theo chuyên khoa -----
export const getDoctorsBySpecialty = async (
  specialtyId,
  statusFilter = "approved",
) => {
  const statuses = getDoctorStatuses(statusFilter);
  const doctors = await DoctorProfile.find({
    specialty: specialtyId,
    status: { $in: statuses },
  })
    .populate({ path: "user", select: "fullName" })
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .limit(10)
    .lean();

  return doctors.filter((doc) => doc.user?.fullName).map(formatDoctorOutput);
};

// ----- Đếm số lượng bác sĩ theo trạng thái -----
export const getDoctorCountByStatus = async (statuses) => {
  try {
    return await DoctorProfile.countDocuments({ status: { $in: statuses } });
  } catch (error) {
    console.error(`[adminDataService] Lỗi đếm bác sĩ: ${error.message}`);
    throw new Error("DB_QUERY_FAILED");
  }
};

// ----- Tìm kiếm phòng khám (chính xác trước, sau đó fuzzy) -----
export const findClinicByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // exact match
  const exactMatch = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: { $in: ["resolved", "contacted"] },
  }).lean();
  if (exactMatch) return exactMatch;

  // fuzzy match
  const allClinics = await ClinicLead.find({
    status: { $in: ["resolved", "contacted"] },
  })
    .select("clinicName address")
    .lean();
  return fuzzyFindByName(allClinics, queryName, "clinicName");
};

// ----- Lấy danh sách bác sĩ theo phòng khám -----
export const getDoctorsByClinic = async (
  clinicId,
  approvalStatus = "approved",
) => {
  const statuses = getDoctorStatuses(approvalStatus);
  const doctors = await DoctorProfile.find({
    clinicId: clinicId,
    status: { $in: statuses },
  })
    .populate("user", "fullName")
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .limit(20)
    .lean();

  return doctors.filter((doc) => doc.user?.fullName).map(formatDoctorOutput);
};

// ----- Lấy danh sách phòng khám theo trạng thái (trả về {_id, clinicName}) -----
export const getClinicsByStatus = async (statuses) => {
  try {
    return await ClinicLead.find(
      { status: { $in: statuses } },
      { clinicName: 1, _id: 1 },
    ).lean();
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi lấy clinic theo status: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

// ----- Lấy chi tiết phòng khám (kèm specialties) -----
export const getClinicDetails = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // exact match
  let clinic = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
  })
    .populate("specialties", "name")
    .lean();
  if (clinic) return clinic;

  // fuzzy match
  const allClinics = await ClinicLead.find({}).select("clinicName").lean();
  const bestMatch = fuzzyFindByName(allClinics, queryName, "clinicName");
  if (bestMatch) {
    clinic = await ClinicLead.findById(bestMatch._id)
      .populate("specialties", "name")
      .lean();
    return clinic;
  }
  return null;
};

// ----- Thống kê tổng số lịch hẹn (toàn hệ thống) -----
export const getTotalAppointmentStats = async () => {
  try {
    const [
      total,
      paid,
      unpaidFailed,
      completed,
      confirmed,
      checkedIn,
      pendingPayment,
      cancelled,
    ] = await Promise.all([
      Appointment.countDocuments({}),
      Appointment.countDocuments({ paymentStatus: "paid" }),
      Appointment.countDocuments({
        paymentStatus: { $in: ["pending", "failed"] },
      }),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.countDocuments({ status: "confirmed" }),
      Appointment.countDocuments({ status: "checked_in" }),
      Appointment.countDocuments({ status: "pending_payment" }),
      Appointment.countDocuments({ status: "cancelled" }),
    ]);
    return {
      total,
      paid,
      unpaidFailed,
      completed,
      confirmed,
      checkedIn,
      pendingPayment,
      cancelled,
    };
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi thống kê lịch hẹn toàn bộ: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

// ----- Thống kê lịch hẹn theo khoảng thời gian -----
export const getAppointmentStatsByDateRange = async (startUTC, endUTC) => {
  if (!startUTC || !endUTC) throw new Error("INVALID_DATE_RANGE");
  const filter = { createdAt: { $gte: startUTC, $lt: endUTC } };
  try {
    const [
      total,
      paid,
      unpaidFailed,
      completed,
      confirmed,
      checkedIn,
      pendingPayment,
      cancelled,
    ] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.countDocuments({ ...filter, paymentStatus: "paid" }),
      Appointment.countDocuments({
        ...filter,
        paymentStatus: { $in: ["pending", "failed"] },
      }),
      Appointment.countDocuments({ ...filter, status: "completed" }),
      Appointment.countDocuments({ ...filter, status: "confirmed" }),
      Appointment.countDocuments({ ...filter, status: "checked_in" }),
      Appointment.countDocuments({ ...filter, status: "pending_payment" }),
      Appointment.countDocuments({ ...filter, status: "cancelled" }),
    ]);
    return {
      total,
      paid,
      unpaidFailed,
      completed,
      confirmed,
      checkedIn,
      pendingPayment,
      cancelled,
    };
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi thống kê lịch hẹn theo khoảng: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

// ----- Lấy doanh thu theo ngày (breakdown) -----
export const getDailyRevenueBreakdown = async (startUTC, endUTC) => {
  try {
    const pipeline = [
      {
        $match: {
          status: "paid",
          $or: [
            { refundStatus: { $ne: "completed" } },
            { refundStatus: { $exists: false } },
          ],
          createdAt: { $gte: startUTC, $lt: endUTC },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const result = await Payment.aggregate(pipeline);
    return result.map((day) => ({
      date: day._id,
      totalRevenue: day.totalRevenue,
      transactionCount: day.transactionCount,
    }));
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi lấy doanh thu theo ngày: ${error.message}`,
    );
    return [];
  }
};

// ----- Thống kê doanh thu theo khoảng thời gian (có breakdown tùy chọn) -----
export const getRevenueStatsByDateRange = async (
  startUTC,
  endUTC,
  needBreakdown = false,
) => {
  try {
    const pipeline = [
      {
        $match: {
          status: "paid",
          $or: [
            { refundStatus: { $ne: "completed" } },
            { refundStatus: { $exists: false } },
          ],
          createdAt: { $gte: startUTC, $lt: endUTC },
        },
      },
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointment",
        },
      },
      { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          onlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$appointment.paymentMethod", "online"] },
                "$amount",
                0,
              ],
            },
          },
          offlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$appointment.paymentMethod", "offline"] },
                "$amount",
                0,
              ],
            },
          },
          onlineCount: {
            $sum: {
              $cond: [{ $eq: ["$appointment.paymentMethod", "online"] }, 1, 0],
            },
          },
          offlineCount: {
            $sum: {
              $cond: [{ $eq: ["$appointment.paymentMethod", "offline"] }, 1, 0],
            },
          },
        },
      },
    ];
    const result = await Payment.aggregate(pipeline);
    const data = result[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      onlineRevenue: 0,
      offlineRevenue: 0,
      onlineCount: 0,
      offlineCount: 0,
    };
    const stats = {
      totalRevenue: data.totalRevenue,
      totalTransactions: data.totalTransactions,
      averageRevenue:
        data.totalTransactions > 0
          ? data.totalRevenue / data.totalTransactions
          : 0,
      onlineRevenue: data.onlineRevenue,
      offlineRevenue: data.offlineRevenue,
      onlineCount: data.onlineCount,
      offlineCount: data.offlineCount,
    };
    if (needBreakdown) {
      stats.dailyBreakdown = await getDailyRevenueBreakdown(startUTC, endUTC);
    }
    return stats;
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi thống kê doanh thu theo khoảng: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

// ----- Thống kê tổng doanh thu (toàn hệ thống) -----
export const getTotalRevenueStats = async () => {
  try {
    // 1. Thống kê thanh toán (giống pipeline của getRevenueStatsByDateRange nhưng không giới hạn thời gian)
    const paymentPipeline = [
      {
        $match: {
          status: "paid",
          $or: [
            { refundStatus: { $ne: "completed" } },
            { refundStatus: { $exists: false } },
          ],
        },
      },
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointment",
        },
      },
      { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          onlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$appointment.paymentMethod", "online"] },
                "$amount",
                0,
              ],
            },
          },
          offlineRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$appointment.paymentMethod", "offline"] },
                "$amount",
                0,
              ],
            },
          },
          onlineCount: {
            $sum: {
              $cond: [{ $eq: ["$appointment.paymentMethod", "online"] }, 1, 0],
            },
          },
          offlineCount: {
            $sum: {
              $cond: [{ $eq: ["$appointment.paymentMethod", "offline"] }, 1, 0],
            },
          },
        },
      },
    ];
    const paymentResult = await Payment.aggregate(paymentPipeline);
    const paymentData = paymentResult[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      onlineRevenue: 0,
      offlineRevenue: 0,
      onlineCount: 0,
      offlineCount: 0,
    };

    // 2. Thống kê phân chia lợi nhuận từ RevenueSplit
    const splitPipeline = [
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalPlatformAmount: { $sum: "$platformAmount" },
          totalClinicAmount: { $sum: "$clinicAmount" },
        },
      },
    ];
    const splitResult = await RevenueSplit.aggregate(splitPipeline);
    const splitData = splitResult[0] || {
      totalPlatformAmount: 0,
      totalClinicAmount: 0,
    };

    const averageRevenue =
      paymentData.totalTransactions > 0
        ? paymentData.totalRevenue / paymentData.totalTransactions
        : 0;

    return {
      totalRevenue: paymentData.totalRevenue,
      totalTransactions: paymentData.totalTransactions,
      averageRevenue,
      onlineRevenue: paymentData.onlineRevenue,
      offlineRevenue: paymentData.offlineRevenue,
      onlineCount: paymentData.onlineCount,
      offlineCount: paymentData.offlineCount,
      totalPlatformRevenue: splitData.totalPlatformAmount,
      totalClinicRevenue: splitData.totalClinicAmount,
    };
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi thống kê doanh thu: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

// ========== THÊM MỚI ==========
/**
 * Lấy doanh thu thực nhận của phòng khám theo từng ngày trong khoảng thời gian
 * @param {ObjectId} clinicId
 * @param {Date} startUTC
 * @param {Date} endUTC
 * @returns {Promise<Array<{date: string, revenue: number}>>}
 */
export const getClinicDailyRevenue = async (clinicId, startUTC, endUTC) => {
  console.log(
    `[DEBUG][DataService] getClinicDailyRevenue called with clinicId=${clinicId}, startUTC=${startUTC.toISOString()}, endUTC=${endUTC.toISOString()}`,
  );
  try {
    const pipeline = [
      {
        $match: {
          clinicId: clinicId,
          status: "completed",
          calculatedAt: { $gte: startUTC, $lt: endUTC },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$calculatedAt" } },
          totalClinicAmount: { $sum: "$clinicAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const result = await RevenueSplit.aggregate(pipeline);
    console.log(
      `[DEBUG][DataService] Aggregation result: ${result.length} days with data`,
      JSON.stringify(result.slice(0, 3), null, 2),
    );
    const mapped = result.map((item) => ({
      date: item._id,
      revenue: item.totalClinicAmount,
    }));
    console.log(`[DEBUG][DataService] Mapped daily revenue:`, mapped);
    return mapped;
  } catch (error) {
    console.error(
      `[adminDataService] getClinicDailyRevenue error: ${error.message}`,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};
