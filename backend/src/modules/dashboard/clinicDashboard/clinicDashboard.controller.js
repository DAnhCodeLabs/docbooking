import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import * as clinicDashboardService from "./clinicDashboard.service.js";
import sendSuccess from "../../../utils/response.js";

export const getClinicDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { startDate, endDate } = req.query;

  const stats = await clinicDashboardService.getClinicDashboardStats(
    userId,
    startDate,
    endDate,
  );

  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy dữ liệu thống kê phòng khám thành công.",
    stats,
  );
});

export const getClinicReviewStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { startDate, endDate, groupBy, sortBy, limit } = req.query;

  const stats = await clinicDashboardService.getClinicReviewStats(userId, {
    startDate,
    endDate,
    groupBy,
    sortBy,
    limit,
  });

  sendSuccess(
    res,
    StatusCodes.OK,
    "Lấy thống kê đánh giá phòng khám thành công.",
    stats,
  );
});