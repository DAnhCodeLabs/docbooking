import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import sendSuccess from "../../../utils/response.js";
import AuditLog from "../../../models/AuditLog.js";
import ApiError from "../../../utils/ApiError.js";
import * as dashboardService from "./dashboard.service.js";
import { getReviewStatsSchema } from "./dashboard.validation.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const stats = await dashboardService.getDashboardStats(startDate, endDate);

  sendSuccess(res, StatusCodes.OK, "Lấy dữ liệu thống kê thành công.", stats);
});

// In-memory cache map để bảo vệ Database khỏi Spam/Rate Limit.
// (Có thể thay thế dễ dàng bằng Redis client trong tương lai)
const statsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

export const getReviewStatistics = async (req, res, next) => {
  try {
    // 1. Validate query input trước khi xử lý
    const validationResult = getReviewStatsSchema.safeParse(req);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new ApiError(StatusCodes.BAD_REQUEST, errorMsg);
    }

    const queryParams = validationResult.data.query;

    // Hỗ trợ Admin lấy dữ liệu realtime nếu cần thiết
    const bypassCache = req.headers["x-bypass-cache"] === "true";

    // 2. Kiểm tra Cache
    const cacheKey = JSON.stringify(queryParams);
    if (!bypassCache && statsCache.has(cacheKey)) {
      const cachedRecord = statsCache.get(cacheKey);
      if (cachedRecord.expiresAt > Date.now()) {
        // Ghi Audit Log Async (Không await để trả response nhanh hơn)
        AuditLog.create({
          userId: req.user._id,
          action: "VIEW_REVIEW_STATS",
          status: "SUCCESS",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          details: { query: queryParams, cached: true },
        }).catch(() => {}); // Nuốt lỗi ghi log để không crash response

        return res.status(StatusCodes.OK).json({
          success: true,
          data: cachedRecord.data,
          lastUpdatedAt: new Date(
            cachedRecord.expiresAt - CACHE_TTL_MS,
          ).toISOString(),
        });
      } else {
        statsCache.delete(cacheKey);
      }
    }

    // 3. Thực thi query nặng qua Service
    const data = await dashboardService.getSystemReviewStatistics(queryParams);

    // 4. Cập nhật Cache
    statsCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // 5. Ghi Audit Log Async
    AuditLog.create({
      userId: req.user._id,
      action: "VIEW_REVIEW_STATS",
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      details: { query: queryParams, cached: false },
    }).catch(() => {});

    // 6. Trả kết quả
    res.status(StatusCodes.OK).json({
      success: true,
      data,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
