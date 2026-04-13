// src/modules/admin/dashboard/dashboard.service.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { StatusCodes } from "http-status-codes";
import Appointment from "../../../models/Appointment.js";
import ClinicLead from "../../../models/ClinicLead.js";
import Payment from "../../../models/Payment.js";
import RevenueSplit from "../../../models/RevenueSplit.js";
import Review from "../../../models/Review.js";
import Specialty from "../../../models/Specialty.js";
import User from "../../../models/User.js";
import ApiError from "../../../utils/ApiError.js";
import { parseDateToUTC } from "../../../utils/date.js";
import logger from "../../../utils/logger.js";

dayjs.extend(utc);

export const getDashboardStats = async (startDate, endDate) => {
  // Chuẩn hóa khoảng thời gian UTC
  let from, to;

  if (startDate && endDate) {
    from = dayjs.utc(startDate).startOf("day").toDate();
    to = dayjs.utc(endDate).endOf("day").toDate();
  } else if (startDate && !endDate) {
    from = dayjs.utc(startDate).startOf("day").toDate();
    to = dayjs.utc(startDate).endOf("month").toDate();
  } else if (!startDate && endDate) {
    from = dayjs.utc(endDate).startOf("month").toDate();
    to = dayjs.utc(endDate).endOf("day").toDate();
  } else {
    from = dayjs.utc().startOf("month").toDate();
    to = dayjs.utc().endOf("month").toDate();
  }

  logger.info(
    `Dashboard query from: ${from.toISOString()} to: ${to.toISOString()}`,
  );

  try {
    // 1. Thống kê người dùng theo role và status
    const userOverview = await User.aggregate([
      {
        $group: {
          _id: { role: "$role", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          role: "$_id.role",
          status: "$_id.status",
          count: 1,
          _id: 0,
        },
      },
    ]);

    const userStats = {
      patient: { active: 0, inactive: 0, banned: 0 },
      doctor: { active: 0, inactive: 0, banned: 0 },
      clinic_admin: { active: 0, inactive: 0, banned: 0 },
      admin: { active: 0, inactive: 0, banned: 0 },
    };
    userOverview.forEach((item) => {
      if (userStats[item.role]) userStats[item.role][item.status] = item.count;
    });

    // 2. Tổng phòng khám đã duyệt
    const totalClinics = await ClinicLead.countDocuments({
      status: "resolved",
    });

    // 3. Tổng chuyên khoa đang hoạt động
    const totalSpecialties = await Specialty.countDocuments({
      status: "active",
    });

    // 4. Thống kê lịch hẹn (dựa trên ngày khám)
    const appointmentStatsAgg = await Appointment.aggregate([
      {
        $lookup: {
          from: "slots",
          localField: "slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: { path: "$slotInfo", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: { path: "$scheduleInfo", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "scheduleInfo.date": { $gte: from, $lte: to },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const appointmentCounts = {
      pending_payment: 0,
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0,
    };
    let totalAppointments = 0;
    appointmentStatsAgg.forEach((item) => {
      if (appointmentCounts[item._id] !== undefined) {
        appointmentCounts[item._id] = item.count;
      }
      totalAppointments += item.count;
    });
    const cancellationRate = totalAppointments
      ? (appointmentCounts.cancelled / totalAppointments) * 100
      : 0;

    // 5. Thống kê doanh thu (dựa trên thời điểm thanh toán thành công)
    const onlineRevenueAgg = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          updatedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const onlineRevenue = onlineRevenueAgg[0] || {
      totalRevenue: 0,
      transactionCount: 0,
    };

    // 2. Doanh thu offline (từ appointment completed, paymentMethod = "offline")
    const offlineRevenueAgg = await Appointment.aggregate([
      {
        $match: {
          paymentMethod: "offline",
          paymentStatus: "paid", // đã thanh toán tại quầy
          status: { $in: ["checked_in", "completed"] },
          isDeleted: { $ne: true },
          // Dùng checkinTime (nếu có) hoặc updatedAt để lọc thời gian
          $or: [
            { checkinTime: { $gte: from, $lte: to } },
            { completedAt: { $gte: from, $lte: to } },
          ],
        },
      },
      {
        $lookup: {
          from: "doctorprofiles",
          localField: "doctor",
          foreignField: "user",
          as: "doctorProfile",
        },
      },
      {
        $unwind: { path: "$doctorProfile", preserveNullAndEmptyArrays: false },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$doctorProfile.consultationFee" },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const revenueSplitAgg = await RevenueSplit.aggregate([
      {
        $match: {
          status: "completed",
          calculatedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          totalPlatformRevenue: { $sum: "$platformAmount" },
          totalClinicRevenue: { $sum: "$clinicAmount" },
        },
      },
    ]);
    const splitRevenue = revenueSplitAgg[0] || {
      totalPlatformRevenue: 0,
      totalClinicRevenue: 0,
    };

    const offlineRevenue = offlineRevenueAgg[0] || {
      totalRevenue: 0,
      transactionCount: 0,
    };

    const totalRevenue =
      onlineRevenue.totalRevenue + offlineRevenue.totalRevenue;
    const totalTransactions =
      onlineRevenue.transactionCount + offlineRevenue.transactionCount;
    const averageTransaction = totalTransactions
      ? totalRevenue / totalTransactions
      : 0;

    const revenue = {
      totalRevenue,
      transactionCount: totalTransactions,
      averageTransaction: parseFloat(averageTransaction.toFixed(2)),
      online: {
        revenue: onlineRevenue.totalRevenue,
        transactionCount: onlineRevenue.transactionCount,
      },
      offline: {
        revenue: offlineRevenue.totalRevenue,
        transactionCount: offlineRevenue.transactionCount,
      },
    };

    // 6. Top 5 bác sĩ
    const topDoctors = await Appointment.aggregate([
      {
        $lookup: {
          from: "slots",
          localField: "slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: "$slotInfo" },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: "$scheduleInfo" },
      {
        $match: {
          status: "completed",
          "scheduleInfo.date": { $gte: from, $lte: to },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$doctor",
          appointmentCount: { $sum: 1 },
        },
      },
      { $sort: { appointmentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      { $unwind: "$doctorUser" },
      {
        $lookup: {
          from: "doctorprofiles",
          localField: "_id",
          foreignField: "user",
          as: "doctorProfile",
        },
      },
      { $unwind: { path: "$doctorProfile", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "specialties",
          localField: "doctorProfile.specialty",
          foreignField: "_id",
          as: "specialty",
        },
      },
      { $unwind: { path: "$specialty", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          fullName: "$doctorUser.fullName",
          specialtyName: "$specialty.name",
          appointmentCount: 1,
        },
      },
    ]);

    // 7. Top 5 phòng khám
    const topClinics = await Appointment.aggregate([
      {
        $lookup: {
          from: "slots",
          localField: "slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: "$slotInfo" },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: "$scheduleInfo" },
      {
        $match: {
          status: "completed",
          "scheduleInfo.date": { $gte: from, $lte: to },
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "doctorprofiles",
          localField: "doctor",
          foreignField: "user",
          as: "doctorProfile",
        },
      },
      {
        $unwind: { path: "$doctorProfile", preserveNullAndEmptyArrays: false },
      },
      {
        $addFields: {
          clinicIdentifier: {
            $cond: [
              { $ifNull: ["$doctorProfile.clinicId", false] },
              "$doctorProfile.clinicId",
              "$doctorProfile.customClinicName",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$clinicIdentifier",
          totalAppointments: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { totalAppointments: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "clinicleads",
          localField: "_id",
          foreignField: "_id",
          as: "clinicInfo",
        },
      },
      {
        $addFields: {
          clinicName: {
            $cond: [
              { $eq: [{ $type: "$_id" }, "objectId"] },
              { $arrayElemAt: ["$clinicInfo.clinicName", 0] },
              "$_id",
            ],
          },
        },
      },
      {
        $project: {
          clinicName: 1,
          totalAppointments: 1,
        },
      },
    ]);
    // ==================== DAILY APPOINTMENTS ====================
    const dailyAppointmentsPipeline = [
      {
        $lookup: {
          from: "slots",
          localField: "slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: { path: "$slotInfo", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: { path: "$scheduleInfo", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "scheduleInfo.date": { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scheduleInfo.date" },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          checked_in: {
            $sum: { $cond: [{ $eq: ["$status", "checked_in"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const dailyAppointments = await Appointment.aggregate(
      dailyAppointmentsPipeline,
    );
    console.log("DEBUG dailyAppointments:", JSON.stringify(dailyAppointments));

    // ==================== DAILY REVENUE ====================
    // Online: từ Payment
    const dailyOnlineRevenuePipeline = [
      {
        $lookup: {
          from: "appointments",
          localField: "appointmentId",
          foreignField: "_id",
          as: "appointmentInfo",
        },
      },
      { $unwind: "$appointmentInfo" },
      {
        $lookup: {
          from: "slots",
          localField: "appointmentInfo.slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: "$slotInfo" },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: "$scheduleInfo" },
      {
        $match: {
          status: "paid",
          "scheduleInfo.date": { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scheduleInfo.date" },
          },
          online: { $sum: "$amount" },
        },
      },
    ];
    const dailyOnlineRevenue = await Payment.aggregate(
      dailyOnlineRevenuePipeline,
    );
    const onlineMap = new Map(
      dailyOnlineRevenue.map((item) => [item._id, item.online]),
    );

    // Offline: từ Appointment (paymentMethod offline, paid)
    const dailyOfflineRevenuePipeline = [
      {
        $lookup: {
          from: "slots",
          localField: "slot",
          foreignField: "_id",
          as: "slotInfo",
        },
      },
      { $unwind: "$slotInfo" },
      {
        $lookup: {
          from: "schedules",
          localField: "slotInfo.scheduleId",
          foreignField: "_id",
          as: "scheduleInfo",
        },
      },
      { $unwind: "$scheduleInfo" },
      {
        $match: {
          paymentMethod: "offline",
          paymentStatus: "paid",
          status: { $in: ["checked_in", "completed"] },
          isDeleted: { $ne: true },
          "scheduleInfo.date": { $gte: from, $lte: to },
        },
      },
      {
        $lookup: {
          from: "doctorprofiles",
          localField: "doctor",
          foreignField: "user",
          as: "doctorProfile",
        },
      },
      { $unwind: "$doctorProfile" },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scheduleInfo.date" },
          },
          offline: { $sum: "$doctorProfile.consultationFee" },
        },
      },
    ];
    const dailyOfflineRevenue = await Appointment.aggregate(
      dailyOfflineRevenuePipeline,
    );
    const offlineMap = new Map(
      dailyOfflineRevenue.map((item) => [item._id, item.offline]),
    );

    // Gộp daily revenue từ online và offline
    const allDates = new Set([...onlineMap.keys(), ...offlineMap.keys()]);
    const dailyRevenue = Array.from(allDates)
      .map((date) => ({
        date,
        online: onlineMap.get(date) || 0,
        offline: offlineMap.get(date) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      overview: {
        users: userStats,
        totalClinics,
        totalSpecialties,
        period: { startDate: from, endDate: to },
      },
      appointmentStats: {
        total: totalAppointments,
        breakdown: appointmentCounts,
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      },
      revenueStats: {
        totalRevenue: revenue.totalRevenue,
        transactionCount: revenue.transactionCount,
        averageTransaction: revenue.averageTransaction,
        online: revenue.online,
        offline: revenue.offline,
      },
      revenueStats: {
        ...revenue,
        platformRevenue: splitRevenue.totalPlatformRevenue,
        clinicRevenue: splitRevenue.totalClinicRevenue,
      },
      topDoctors,
      topClinics,
      dailyAppointments,
      dailyRevenue,
    };
  } catch (error) {
    logger.error(`Lỗi lấy dashboard stats: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không thể lấy dữ liệu thống kê, vui lòng thử lại sau.",
    );
  }
};

export const getSystemReviewStatistics = async (query) => {
  const { startDate, endDate, entityType, limitTop } = query;

  // 1. Chuẩn hóa thời gian (Mặc định 30 ngày gần nhất nếu không truyền param)
  const to = endDate
    ? dayjs.utc(endDate).endOf("day").toDate()
    : dayjs.utc().endOf("day").toDate();
  const from = startDate
    ? parseDateToUTC(startDate)
    : dayjs.utc(to).subtract(30, "day").startOf("day").toDate();

  // 2. Xây dựng $match base chặn review rác/xóa mềm
  const baseMatch = {
    createdAt: { $gte: from, $lte: to },
    isDeleted: { $ne: true },
    $or: [
      { status: { $exists: false } },
      { status: { $in: ["approved", "active", "published"] } },
    ],
  };

  if (entityType === "doctor") {
    baseMatch.doctorId = { $exists: true, $ne: null };
  } else if (entityType === "clinic") {
    baseMatch.clinicId = { $exists: true, $ne: null };
  }

  // 3. Pipeline Facet chạy song song đa luồng tính toán
  const facetPipeline = {
    overview: [
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      {
        $project: {
          _id: 0,
          totalReviews: 1,
          averageRating: { $round: [{ $ifNull: ["$averageRating", 0] }, 1] },
        },
      },
    ],
    distribution: [
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ],
    trend: [
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          average: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          average: { $round: [{ $ifNull: ["$average", 0] }, 1] },
          count: 1,
          _id: 0,
        },
      },
    ],
  };

  // 4. Xử lý Leaderboard
  const MIN_REVIEWS = 1; // Tạm thời hạ xuống 1 để test bảng xếp hạng

  if (entityType === "doctor" || entityType === "all") {
    const doctorRankPipeline = [
      { $match: { doctorId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$doctorId",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      { $match: { totalReviews: { $gte: MIN_REVIEWS } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "doctorUser",
        },
      },
      { $unwind: { path: "$doctorUser", preserveNullAndEmptyArrays: false } },
      { $match: { "doctorUser.status": "active" } }, // Chặn bác sĩ đã bị admin xoá mềm/khoá
      {
        $project: {
          id: "$_id",
          name: "$doctorUser.fullName",
          type: "doctor",
          averageRating: { $round: [{ $ifNull: ["$averageRating", 0] }, 1] },
          totalReviews: 1,
          _id: 0,
        },
      },
    ];

    facetPipeline.topDoctors = [
      ...doctorRankPipeline,
      { $match: { averageRating: { $gte: 4.5 } } },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $limit: limitTop },
    ];
    facetPipeline.bottomDoctors = [
      ...doctorRankPipeline,
      { $match: { averageRating: { $lte: 4.0 } } },
      { $sort: { averageRating: 1, totalReviews: -1 } },
      { $limit: limitTop },
    ];
  }

  if (entityType === "clinic" || entityType === "all") {
    const clinicRankPipeline = [
      { $match: { clinicId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$clinicId",
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      { $match: { totalReviews: { $gte: MIN_REVIEWS } } },
      {
        $lookup: {
          from: "clinicleads",
          localField: "_id",
          foreignField: "_id",
          as: "clinicInfo",
        },
      },
      { $unwind: { path: "$clinicInfo", preserveNullAndEmptyArrays: false } },
      { $match: { "clinicInfo.status": "resolved" } }, // Chặn phòng khám đã bị huỷ hợp tác
      {
        $project: {
          id: "$_id",
          name: "$clinicInfo.clinicName",
          type: "clinic",
          averageRating: { $round: [{ $ifNull: ["$averageRating", 0] }, 1] },
          totalReviews: 1,
          _id: 0,
        },
      },
    ];

    facetPipeline.topClinics = [
      ...clinicRankPipeline,
      { $match: { averageRating: { $gte: 4.5 } } },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $limit: limitTop },
    ];
    facetPipeline.bottomClinics = [
      ...clinicRankPipeline,
      { $match: { averageRating: { $lte: 4.0 } } },
      { $sort: { averageRating: 1, totalReviews: -1 } },
      { $limit: limitTop },
    ];
  }

  // 5. Thực thi Aggregation trong 1 lần gọi DB duy nhất
  const [result] = await Review.aggregate([
    { $match: baseMatch },
    { $facet: facetPipeline },
  ]);

  // 6. Trích xuất và Format dữ liệu an toàn
  const overview = result.overview[0] || { totalReviews: 0, averageRating: 0 };
  const distribution = { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };

  (result.distribution || []).forEach((item) => {
    if (item._id >= 1 && item._id <= 5)
      distribution[`star${item._id}`] = item.count;
  });

  let topPerformers = [];
  let bottomPerformers = [];

  if (entityType === "all") {
    topPerformers = [...(result.topDoctors || []), ...(result.topClinics || [])]
      .sort(
        (a, b) =>
          b.averageRating - a.averageRating || b.totalReviews - a.totalReviews,
      )
      .slice(0, limitTop);

    bottomPerformers = [
      ...(result.bottomDoctors || []),
      ...(result.bottomClinics || []),
    ]
      .sort(
        (a, b) =>
          a.averageRating - b.averageRating || b.totalReviews - a.totalReviews,
      )
      .slice(0, limitTop);
  } else if (entityType === "doctor") {
    topPerformers = result.topDoctors || [];
    bottomPerformers = result.bottomDoctors || [];
  } else if (entityType === "clinic") {
    topPerformers = result.topClinics || [];
    bottomPerformers = result.bottomClinics || [];
  }

  return {
    overview,
    distribution,
    trend: result.trend || [],
    topPerformers,
    bottomPerformers,
  };
};
