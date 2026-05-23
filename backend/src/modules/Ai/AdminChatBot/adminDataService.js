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
import User from "../../../models/User.js";

// ===============================
// 2. HELPER FUNCTIONS (EXTREME DRY)
// ===============================

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

const fuzzyFindByName = (items, queryName, fieldName = "name") => {
  if (!queryName || queryName.length < 2 || !items?.length) return null;
  const queryWords = normalizeVietnamese(queryName)
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  let bestMatch = null,
    maxRatio = 0;
  for (const item of items) {
    const matched = queryWords.reduce(
      (count, w) =>
        count + (normalizeVietnamese(item[fieldName]).includes(w) ? 1 : 0),
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
 * DRY: Tìm kiếm thực thể chung (Exact -> Fuzzy -> Populate)
 */
const smartFind = async (
  Model,
  queryName,
  fieldName,
  baseFilter = {},
  populates = [],
) => {
  if (!queryName || queryName.length < 2) return null;

  // 1. Exact Match
  let exactQuery = Model.findOne({
    [fieldName]: { $regex: new RegExp(`^${queryName}$`, "i") },
    ...baseFilter,
  });
  populates.forEach(
    (p) => (exactQuery = exactQuery.populate(p.path, p.select)),
  );
  const exactMatch = await exactQuery.lean();
  if (exactMatch) return exactMatch;

  // 2. Fuzzy Match (chỉ select fieldName và _id để tối ưu RAM)
  const allItems = await Model.find(baseFilter).select(fieldName).lean();
  const bestMatch = fuzzyFindByName(allItems, queryName, fieldName);
  if (!bestMatch) return null;

  // 3. Re-fetch best match với đầy đủ dữ liệu
  let fuzzyQuery = Model.findById(bestMatch._id);
  populates.forEach(
    (p) => (fuzzyQuery = fuzzyQuery.populate(p.path, p.select)),
  );
  return await fuzzyQuery.lean();
};

const getDoctorStatuses = (statusFilter) =>
  statusFilter === "pending"
    ? ["pending", "pending_admin_approval"]
    : ["active"];

const formatDoctorOutput = (doc) => ({
  id: doc._id,
  fullName: doc.user?.fullName || null,
  experience: doc.experience,
  consultationFee: doc.consultationFee,
  totalReviews: doc.totalReviews,
  clinicName: doc.clinicId?.clinicName || null,
  clinicAddress: doc.clinicId?.address || null,
});

const fetchDoctors = async (filter, limitSize) => {
  const doctors = await DoctorProfile.find(filter)
    .populate("user", "fullName")
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .limit(limitSize)
    .lean();
  return doctors.filter((doc) => doc.user?.fullName).map(formatDoctorOutput);
};

/**
 * DRY: Gom 8 CountQueries thành 1 Aggregation Pipeline duy nhất
 */
const getAppointmentStats = async (matchFilter = {}) => {
  const pipeline = [
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
        unpaidFailed: {
          $sum: {
            $cond: [{ $in: ["$paymentStatus", ["pending", "failed"]] }, 1, 0],
          },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
        },
        checkedIn: {
          $sum: { $cond: [{ $eq: ["$status", "checked_in"] }, 1, 0] },
        },
        pendingPayment: {
          $sum: { $cond: [{ $eq: ["$status", "pending_payment"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
  ];

  const result =
    Object.keys(matchFilter).length > 0
      ? await Appointment.aggregate([{ $match: matchFilter }, ...pipeline])
      : await Appointment.aggregate(pipeline);

  const stats = result[0] || {
    total: 0,
    paid: 0,
    unpaidFailed: 0,
    completed: 0,
    confirmed: 0,
    checkedIn: 0,
    pendingPayment: 0,
    cancelled: 0,
  };
  delete stats._id;
  return stats;
};

/**
 * DRY: Tái sử dụng pipeline tính tổng doanh thu thanh toán
 */
const getPaymentStats = async (matchFilter = {}) => {
  // --- BẮT ĐẦU: DEEP PROBE DEBUG ---
  try {
    console.log(
      `[DEBUG][DeepProbe] Đang kiểm tra chéo dữ liệu Offline giữa Appointment và Payment...`,
    );

    // 1. Tìm thử 1 lịch hẹn Offline đã thanh toán bên bảng Appointment
    const sampleOfflineAppt = await Appointment.findOne({
      paymentMethod: "offline",
      paymentStatus: "paid",
    }).lean();

    if (sampleOfflineAppt) {
      console.log(
        `[DEBUG][DeepProbe] 1. TÌM THẤY Appointment Offline. ID: ${sampleOfflineAppt._id}`,
      );

      // 2. Tìm bản ghi Payment tương ứng với ID lịch hẹn này
      const relatedPayment = await Payment.findOne({
        $or: [
          { appointmentId: sampleOfflineAppt._id },
          { appointmentId: String(sampleOfflineAppt._id) },
        ],
      }).lean();

      if (!relatedPayment) {
        console.log(
          `[DEBUG][DeepProbe] 2. 🚨 CẢNH BÁO ĐỎ: KHÔNG TÌM THẤY bản ghi nào trong bảng 'Payment' chứa appointmentId này!`,
        );
        console.log(
          `[DEBUG][DeepProbe] -> KẾT LUẬN: Doanh thu Offline bị bằng 0 là do hệ thống Backend CHƯA TẠO bản ghi Payment khi thu tiền mặt.`,
        );
      } else {
        console.log(
          `[DEBUG][DeepProbe] 2. TÌM THẤY Payment. Dữ liệu:`,
          JSON.stringify(relatedPayment),
        );
        console.log(
          `[DEBUG][DeepProbe] -> KẾT LUẬN: Payment có tồn tại. Vấn đề nằm ở cấu trúc data bên trong Payment (VD: field 'amount' bị rỗng).`,
        );
      }
    } else {
      console.log(
        `[DEBUG][DeepProbe] 1. Không có Lịch hẹn Offline nào thoả mãn điều kiện.`,
      );
    }
  } catch (err) {
    console.error(`[DEBUG][DeepProbe] Lỗi khi chạy Probe:`, err.message);
  }
  console.log(
    `[DEBUG][RevenueStats][DataService] Bắt đầu chạy Aggregation tính doanh thu. Bộ lọc (Match Filter):`,
    JSON.stringify(matchFilter),
  );
  const startTime = Date.now();

  const result = await Payment.aggregate([
    {
      $match: {
        status: { $in: ["paid", "completed", "success"] },
        $or: [
          { refundStatus: { $ne: "completed" } },
          { refundStatus: { $exists: false } },
        ],
        ...matchFilter,
      },
    },
    // 1. Ép kiểu ID an toàn để Lookup không bị trượt
    {
      $addFields: {
        appointmentIdObj: {
          $convert: {
            input: "$appointmentId",
            to: "objectId",
            onError: "$appointmentId", // Giữ nguyên nếu lỗi
            onNull: null,
          },
        },
      },
    },
    // 2. Lookup lấy thông tin gốc từ bảng Appointment
    {
      $lookup: {
        from: "appointments",
        localField: "appointmentIdObj",
        foreignField: "_id",
        as: "appointment",
      },
    },
    { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },

    // 3. [HOTFIX]: Xác định nguồn chân lý (Source of Truth) cho hình thức thanh toán
    {
      $addFields: {
        effectivePaymentMethod: {
          // ƯU TIÊN 1: Lấy phương thức thanh toán từ Appointment (Bản ghi chốt ca khám cuối cùng)
          // ƯU TIÊN 2: Nếu không có (Lịch hẹn bị xoá/lỗi), mới dùng tạm của bảng Payment
          $ifNull: ["$appointment.paymentMethod", "$paymentMethod"],
        },
      },
    },

    // 4. Gom nhóm và tính toán doanh thu cực kỳ rành mạch dựa trên effectivePaymentMethod
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalTransactions: { $sum: 1 },
        onlineRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$effectivePaymentMethod", "online"] },
              "$amount",
              0,
            ],
          },
        },
        offlineRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$effectivePaymentMethod", "offline"] },
              "$amount",
              0,
            ],
          },
        },
        onlineCount: {
          $sum: {
            $cond: [{ $eq: ["$effectivePaymentMethod", "online"] }, 1, 0],
          },
        },
        offlineCount: {
          $sum: {
            $cond: [{ $eq: ["$effectivePaymentMethod", "offline"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const data = result[0] || {
    totalRevenue: 0,
    totalTransactions: 0,
    onlineRevenue: 0,
    offlineRevenue: 0,
    onlineCount: 0,
    offlineCount: 0,
  };

  const executionTime = Date.now() - startTime;
  console.log(
    `[DEBUG][RevenueStats][DataService] Hoàn thành Aggregation trong ${executionTime}ms. Kết quả: Tổng = ${data.totalRevenue} VNĐ | Online = ${data.onlineRevenue} | Offline = ${data.offlineRevenue}`,
  );

  return {
    ...data,
    averageRevenue:
      data.totalTransactions > 0
        ? data.totalRevenue / data.totalTransactions
        : 0,
  };
};

// ===============================
// 3. EXPORTED FUNCTIONS
// ===============================

export const findSpecialtyByName = (queryName) =>
  smartFind(Specialty, queryName, "name", { status: "active" });

export const findClinicByName = (queryName) =>
  smartFind(ClinicLead, queryName, "clinicName", {
    status: { $in: ["resolved", "contacted"] },
  });

export const getClinicDetails = (queryName) =>
  smartFind(ClinicLead, queryName, "clinicName", {}, [
    { path: "specialties", select: "name" },
  ]);

export const getDoctorsBySpecialty = (specialtyId, statusFilter = "approved") =>
  fetchDoctors(
    {
      specialty: specialtyId,
      status: { $in: getDoctorStatuses(statusFilter) },
    },
    10,
  );

export const getDoctorsByClinic = (clinicId, approvalStatus = "approved") =>
  fetchDoctors(
    { clinicId, status: { $in: getDoctorStatuses(approvalStatus) } },
    20,
  );

export const getDoctorCountByStatus = (statuses) =>
  DoctorProfile.countDocuments({ status: { $in: statuses } });

export const getClinicsByStatus = (statuses) =>
  ClinicLead.find(
    { status: { $in: statuses } },
    { clinicName: 1, _id: 1 },
  ).lean();

export const getTotalAppointmentStats = () => getAppointmentStats({});

export const getAppointmentStatsByDateRange = (startUTC, endUTC) => {
  if (!startUTC || !endUTC) throw new Error("INVALID_DATE_RANGE");
  return getAppointmentStats({ createdAt: { $gte: startUTC, $lt: endUTC } });
};

export const getDailyRevenueBreakdown = async (startUTC, endUTC) => {
  const result = await Payment.aggregate([
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
  ]);
  return result.map((day) => ({
    date: day._id,
    totalRevenue: day.totalRevenue,
    transactionCount: day.transactionCount,
  }));
};

export const getRevenueStatsByDateRange = async (
  startUTC,
  endUTC,
  needBreakdown = false,
) => {
  const stats = await getPaymentStats({
    createdAt: { $gte: startUTC, $lt: endUTC },
  });
  delete stats._id;
  if (needBreakdown)
    stats.dailyBreakdown = await getDailyRevenueBreakdown(startUTC, endUTC);
  return stats;
};

export const getTotalRevenueStats = async () => {
  const [paymentData, splitResult] = await Promise.all([
    getPaymentStats(),
    RevenueSplit.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalPlatformAmount: { $sum: "$platformAmount" },
          totalClinicAmount: { $sum: "$clinicAmount" },
        },
      },
    ]),
  ]);
  delete paymentData._id;
  const splitData = splitResult[0] || {
    totalPlatformAmount: 0,
    totalClinicAmount: 0,
  };
  return {
    ...paymentData,
    totalPlatformRevenue: splitData.totalPlatformAmount,
    totalClinicRevenue: splitData.totalClinicAmount,
  };
};

export const getClinicDailyRevenue = async (clinicId, startUTC, endUTC) => {
  const result = await RevenueSplit.aggregate([
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
  ]);
  return result.map((item) => ({
    date: item._id,
    revenue: item.totalClinicAmount,
  }));
};

/**
 * Lấy Top Bác sĩ có lịch hẹn đã hoàn thành nhiều nhất
 */
export const getTopDoctorsCompletedAppointments = async (limitSize = 5) => {
  console.log(
    `[DEBUG][TopDoctors][DataService] Bắt đầu chạy Aggregation kéo Top ${limitSize} bác sĩ...`,
  );
  const startTime = Date.now(); // Bắt đầu đếm giờ

  const result = await Appointment.aggregate([
    // 1. Lọc chỉ lấy lịch hẹn "completed"
    { $match: { status: "completed" } },
    // 2. Gom nhóm theo bác sĩ và đếm số lượng
    {
      $group: {
        _id: "$doctor",
        count: { $sum: 1 },
      },
    },
    // 3. Sắp xếp: Số lượng giảm dần. Nếu bằng nhau, xếp theo ID tăng dần (Tie-breaker)
    { $sort: { count: -1, _id: 1 } },
    // 4. Giới hạn số lượng (Top 5)
    { $limit: limitSize },
    // 5. Lookup sang collection users để lấy tên bác sĩ
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "doctorInfo",
      },
    },
    { $unwind: "$doctorInfo" },
    // 6. Project format output (KISS)
    {
      $project: {
        _id: 0,
        doctorId: "$_id",
        doctorName: "$doctorInfo.fullName",
        completedCount: "$count",
      },
    },
  ]);

  const executionTime = Date.now() - startTime;
  console.log(
    `[DEBUG][TopDoctors][DataService] Hoàn thành Aggregation trong ${executionTime}ms. Số lượng tìm thấy: ${result.length} bác sĩ.`,
  );

  if (result.length > 0) {
    console.log(
      `[DEBUG][TopDoctors][DataService] Dẫn đầu: BS. ${result[0].doctorName} (${result[0].completedCount} ca)`,
    );
  }

  return result;
};