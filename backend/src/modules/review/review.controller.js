import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../utils/response.js";
import * as reviewService from "./review.service.js";

export const createReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const review = await reviewService.createReview(userId, req.body);
  sendSuccess(res, StatusCodes.CREATED, "Đánh giá thành công.", review);
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page, limit } = req.query;
  const result = await reviewService.getMyReviews(userId, page, limit);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy danh sách đánh giá thành công.",
    result,
  );
});

export const getDoctorReviews = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { page, limit } = req.query;
  const result = await reviewService.getDoctorReviews(doctorId, page, limit);
  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy đánh giá của bác sĩ thành công.",
    result,
  );
});

export const getReviewStats = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const { startDate, endDate, groupBy } = req.query;

  const stats = await reviewService.getReviewStats(doctorId, {
    startDate,
    endDate,
    groupBy,
  });

  sendSuccess(res, StatusCodes.OK, "Lấy thống kê đánh giá thành công.", stats);
});