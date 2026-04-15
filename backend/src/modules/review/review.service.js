import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import Appointment from '../../models/Appointment.js';
import Review from '../../models/Review.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import logger from '../../utils/logger.js';

/**
 * Tạo đánh giá mới
 */
export const createReview = async (userId, data) => {
  const { appointmentId, rating, comment } = data;

  // 1. Tìm appointment, kiểm tra quyền và trạng thái
  const appointment = await Appointment.findById(appointmentId)
    .populate('bookingUser', '_id')
    .populate('doctor', '_id');
  if (!appointment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy lịch hẹn.');
  }

  // Kiểm tra user chính là người đặt lịch
  if (appointment.bookingUser._id.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Bạn không có quyền đánh giá lịch hẹn này.'
    );
  }

  // Chỉ được đánh giá khi ca khám đã hoàn thành
  if (appointment.status !== 'completed') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Chỉ có thể đánh giá sau khi ca khám hoàn thành.'
    );
  }

  // 2. Kiểm tra đã có review chưa
  const existingReview = await Review.findOne({ appointmentId });
  if (existingReview) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Bạn đã đánh giá lịch hẹn này rồi.'
    );
  }

  // 3. Tạo review
  const review = await Review.create({
    appointmentId,
    patientId: userId,
    doctorId: appointment.doctor._id,
    rating,
    comment: comment || '',
  });

  return review;
};

/**
 * Lấy danh sách review của user hiện tại (có phân trang)
 */
export const getMyReviews = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ patientId: userId })
      .populate('doctorId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ patientId: userId }),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Lấy danh sách review công khai của một bác sĩ (kèm rating trung bình)
 */
export const getDoctorReviews = async (doctorId, page, limit) => {
  // Kiểm tra bác sĩ tồn tại (tuỳ chọn, nhưng nên có)
  const doctor = await User.findById(doctorId).select('_id');
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy bác sĩ.');
  }

  const skip = (page - 1) * limit;

  const [reviews, total, ratingAgg] = await Promise.all([
    Review.find({ doctorId })
      .populate('patientId', 'fullName avatar') // có thể ẩn bớt thông tin nhạy cảm
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ doctorId }),
    Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]),
  ]);

  const averageRating = ratingAgg[0]
    ? parseFloat(ratingAgg[0].avgRating.toFixed(1))
    : 0;

  return {
    reviews,
    total,
    averageRating,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Lấy thống kê đánh giá của bác sĩ
 * @param {string} doctorId
 * @param {Object} query - { startDate, endDate, groupBy }
 * @returns {Promise<Object>}
 */
export const getReviewStats = async (doctorId, query = {}) => {
  const { startDate, endDate, groupBy = 'month' } = query;

  logger.info(`[ReviewStats] doctorId from token: ${doctorId}`);
  const doctorObjectId = new mongoose.Types.ObjectId(doctorId);
  logger.info(`[ReviewStats] doctorId from token: ${doctorId}`);
  const totalDocs = await Review.countDocuments({ doctorId: doctorObjectId });
  logger.info(
    `[ReviewStats] Total reviews for this doctor (without date filter): ${totalDocs}`
  );
  const match = { doctorId: doctorObjectId };

  // Nếu có filter ngày tháng
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  // 2. Aggregation pipeline
  const pipeline = [];

  // $match
  pipeline.push({ $match: match });

  // 3. Facet để tính tổng quan và distribution
  const facet = {
    totalReviews: [{ $count: 'count' }],
    averageRating: [{ $group: { _id: null, avg: { $avg: '$rating' } } }],
    ratingDistribution: [
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          rating: '$_id',
          count: 1,
        },
      },
    ],
  };

  // 4. Nếu có groupBy, thêm trend (theo period)
  let trendPipeline = [];
  if (groupBy) {
    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = { $isoWeek: '$createdAt' }; // tuần trong năm
        break;
      case 'month':
        dateFormat = { $month: '$createdAt' };
        break;
      case 'quarter':
        dateFormat = { $quarter: '$createdAt' };
        break;
      default:
        dateFormat = { $month: '$createdAt' };
    }
    trendPipeline = [
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            period: dateFormat,
          },
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.period' },
            ],
          },
          avgRating: { $round: ['$avgRating', 1] },
          count: 1,
        },
      },
      { $sort: { period: 1 } },
    ];
  }

  // Ghép pipeline
  if (trendPipeline.length) {
    pipeline.push({
      $facet: {
        ...facet,
        trend: trendPipeline,
      },
    });
  } else {
    pipeline.push({ $facet: facet });
  }

  const result = await Review.aggregate(pipeline);
  const data = result[0] || {};

  // Format kết quả
  const totalReviews = data.totalReviews?.[0]?.count || 0;
  const averageRating = data.averageRating?.[0]?.avg
    ? parseFloat(data.averageRating[0].avg.toFixed(1))
    : 0;

  // Distribution: đảm bảo có đủ key 1-5
  const distributionMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (data.ratingDistribution || []).forEach((item) => {
    if (item.rating >= 1 && item.rating <= 5) {
      distributionMap[item.rating] = item.count;
    }
  });

  return {
    totalReviews,
    averageRating,
    ratingDistribution: distributionMap,
    trend: data.trend || [],
  };
};
