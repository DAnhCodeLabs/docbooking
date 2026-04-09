import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Appointment from "../../../models/Appointment.js";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Payment from "../../../models/Payment.js";
import RevenueSplit from "../../../models/RevenueSplit.js";
import Review from "../../../models/Review.js";
import ApiError from "../../../utils/ApiError.js";
import logger from "../../../utils/logger.js";
import * as doctorService from "../../doctor/doctor.service.js";

dayjs.extend(utc);

export const getClinicDashboardStats = async (userId, startDate, endDate) => {
  // 1. Tìm clinic của user
  const clinic = await ClinicLead.findOne({ user: userId, status: "resolved" });
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào hoặc phòng khám chưa được duyệt.",
    );
  }

  // 2. Lấy danh sách doctorIds thuộc clinic
  const doctorIds = await doctorService.getDoctorIdsByClinic(
    clinic._id,
    clinic.clinicName,
  );
  if (doctorIds.length === 0) {
    return {
      overview: {
        totalDoctors: 0,
        totalPatients: 0,
        clinicName: clinic.clinicName,
      },
      appointmentStats: { total: 0, breakdown: {}, cancellationRate: 0 },
      revenueStats: {
        totalRevenue: 0,
        transactionCount: 0,
        averageTransaction: 0,
        online: { revenue: 0, transactionCount: 0 },
        offline: { revenue: 0, transactionCount: 0 },
        platformRevenue: 0,
        clinicRevenue: 0,
      },
      topDoctors: [],
    };
  }

  // 3. Chuẩn hóa khoảng thời gian UTC
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
    `Clinic dashboard query for clinic ${clinic.clinicName}, from: ${from.toISOString()} to: ${to.toISOString()}`,
  );

  try {
    // 4. Thống kê số bác sĩ active
    const totalDoctors = await DoctorProfile.countDocuments({
      user: { $in: doctorIds },
      status: "active",
    });

    // 5. Thống kê số bệnh nhân (distinct patientProfile) từ appointment của clinic trong kỳ
    const patientCountResult = await Appointment.aggregate([
      {
        $match: {
          doctor: {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isDeleted: { $ne: true },
        },
      },
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
          "scheduleInfo.date": { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: "$patientProfile",
        },
      },
      { $count: "total" },
    ]);
    const totalPatients = patientCountResult[0]?.total || 0;

    // 6. Thống kê lịch hẹn (dựa trên ngày khám)
    const appointmentStatsAgg = await Appointment.aggregate([
      {
        $match: {
          doctor: {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isDeleted: { $ne: true },
        },
      },
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
          "scheduleInfo.date": { $gte: from, $lte: to },
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

    // 7. Doanh thu online (từ Payment)
    const onlineRevenueAgg = await Payment.aggregate([
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
        $match: {
          "appointmentInfo.doctor": {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
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

    // 8. Doanh thu offline (từ appointment)
    const offlineRevenueAgg = await Appointment.aggregate([
      {
        $match: {
          doctor: {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          paymentMethod: "offline",
          paymentStatus: "paid",
          status: { $in: ["checked_in", "completed"] },
          isDeleted: { $ne: true },
        },
      },
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

    // 9. Doanh thu thực nhận từ RevenueSplit (phần trăm platform và clinic)
    const revenueSplitAgg = await RevenueSplit.aggregate([
      {
        $match: {
          clinicId: clinic._id,
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

    // 10. Top bác sĩ của clinic (dựa trên appointment completed trong kỳ)
    const topDoctors = await Appointment.aggregate([
      {
        $match: {
          doctor: {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          status: "completed",
          isDeleted: { $ne: true },
        },
      },
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
          "scheduleInfo.date": { $gte: from, $lte: to },
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

    return {
      overview: {
        totalDoctors,
        totalPatients,
        clinicName: clinic.clinicName,
        period: { startDate: from, endDate: to },
      },
      appointmentStats: {
        total: totalAppointments,
        breakdown: appointmentCounts,
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      },
      revenueStats: {
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
        platformRevenue: splitRevenue.totalPlatformRevenue,
        clinicRevenue: splitRevenue.totalClinicRevenue,
      },
      topDoctors,
    };
  } catch (error) {
    logger.error(`Lỗi lấy clinic dashboard stats: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không thể lấy dữ liệu thống kê cho phòng khám, vui lòng thử lại sau.",
    );
  }
};

/**
 * Lấy thống kê đánh giá cho phòng khám (clinic_admin)
 * @param {string} userId - _id của clinic_admin
 * @param {Object} query - { startDate, endDate, groupBy, sortBy, limit }
 * @returns {Promise<Object>}
 */
export const getClinicReviewStats = async (userId, query = {}) => {
  let {
    startDate,
    endDate,
    groupBy = "month",
    sortBy = "avgRating",
    limit = 5,
  } = query;
  // Ép kiểu limit về number
  limit = Number(limit);
  if (isNaN(limit) || limit <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Limit phải là số dương");
  }
  // Giới hạn limit tối đa 20 để tránh query quá lớn
  if (limit > 20) limit = 20;

  // 1. Tìm clinic của user
  const clinic = await ClinicLead.findOne({ user: userId, status: "resolved" });
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào hoặc phòng khám chưa được duyệt.",
    );
  }

  // 2. Lấy danh sách doctorIds thuộc clinic
  const doctorIds = await doctorService.getDoctorIdsByClinic(
    clinic._id,
    clinic.clinicName,
  );
  if (doctorIds.length === 0) {
    // Phòng khám chưa có bác sĩ
    return {
      clinicName: clinic.clinicName,
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      topDoctors: [],
      bottomDoctors: [],
      trend: [],
    };
  }

  // Chuyển đổi doctorIds thành ObjectId
  const doctorObjectIds = doctorIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  // 3. Xây dựng match condition
  const match = { doctorId: { $in: doctorObjectIds } };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  // 4. Aggregation pipeline
  const pipeline = [];

  // 4.1 Match
  pipeline.push({ $match: match });

  // 4.2 Facet cho tổng quan + distribution
  const facet = {
    totalReviews: [{ $count: "count" }],
    averageRating: [{ $group: { _id: null, avg: { $avg: "$rating" } } }],
    ratingDistribution: [
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          rating: "$_id",
          count: 1,
        },
      },
    ],
  };

  // 4.3 Top/Bottom doctors
  const doctorStatsPipeline = [
    {
      $group: {
        _id: "$doctorId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "doctorInfo",
      },
    },
    { $unwind: "$doctorInfo" },
    {
      $project: {
        doctorId: "$_id",
        fullName: "$doctorInfo.fullName",
        avgRating: { $round: ["$avgRating", 1] },
        totalReviews: 1,
      },
    },
  ];

  // Top doctors (theo sortBy)
  const sortDirection = sortBy === "avgRating" ? -1 : -1; // cả hai đều giảm dần
  const topDoctorsPipeline = [
    ...doctorStatsPipeline,
    { $sort: { [sortBy]: -1 } },
    { $limit: limit },
  ];

  const bottomDoctorsPipeline = [
    ...doctorStatsPipeline,
    {
      $match: {
        totalReviews: { $gt: 0 },
        avgRating: { $lt: 4 }, // Chỉ lấy bác sĩ có điểm dưới 4
      },
    },
    { $sort: { [sortBy]: 1 } },
    { $limit: limit },
  ];

  // 4.4 Trend theo groupBy
  let dateFormat;
  switch (groupBy) {
    case "week":
      dateFormat = { $isoWeek: "$createdAt" };
      break;
    case "month":
      dateFormat = { $month: "$createdAt" };
      break;
    case "quarter":
      dateFormat = { $quarter: "$createdAt" };
      break;
    default:
      dateFormat = { $month: "$createdAt" };
  }

  const trendPipeline = [
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          period: dateFormat,
        },
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        period: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            { $toString: "$_id.period" },
          ],
        },
        avgRating: { $round: ["$avgRating", 1] },
        count: 1,
      },
    },
    { $sort: { period: 1 } },
  ];

  // 4.5 Kết hợp tất cả vào một pipeline duy nhất
  // Xóa định nghĩa facet cũ, thay bằng các pipeline trực tiếp trong $facet
  const finalPipeline = [
    { $match: match },
    {
      $facet: {
        totalReviews: [{ $count: "count" }],
        averageRating: [{ $group: { _id: null, avg: { $avg: "$rating" } } }],
        ratingDistribution: [
          {
            $group: {
              _id: "$rating",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              rating: "$_id",
              count: 1,
            },
          },
        ],
        topDoctors: topDoctorsPipeline,
        bottomDoctors: bottomDoctorsPipeline,
        trend: trendPipeline,
      },
    },
  ];

  const result = await Review.aggregate(finalPipeline);
  const data = result[0] || {};

  const totalReviews = data.totalReviews?.[0]?.count || 0;
  const averageRating = data.averageRating?.[0]?.avg
    ? parseFloat(data.averageRating[0].avg.toFixed(1))
    : 0;

  const distributionMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (data.ratingDistribution || []).forEach((item) => {
    if (item.rating >= 1 && item.rating <= 5) {
      distributionMap[item.rating] = item.count;
    }
  });

  return {
    clinicName: clinic.clinicName,
    totalReviews,
    averageRating,
    ratingDistribution: distributionMap,
    topDoctors: data.topDoctors || [],
    bottomDoctors: data.bottomDoctors || [],
    trend: data.trend || [],
  };
};
