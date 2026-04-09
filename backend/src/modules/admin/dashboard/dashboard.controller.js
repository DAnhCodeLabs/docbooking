import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../../utils/response.js";
import * as dashboardService from "./dashboard.service.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await dashboardService.getDashboardStats(startDate, endDate);

  sendSuccess(res, StatusCodes.OK, "Lấy dữ liệu thống kê thành công.", stats);
});
