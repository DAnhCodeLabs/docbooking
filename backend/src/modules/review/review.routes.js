import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as reviewController from "./review.controller.js";
import * as reviewValidation from "./review.validation.js";

const router = express.Router();

// Tạo review (chỉ patient)
router.post(
  "/",
  protect,
  restrictTo("patient"),
  validate(reviewValidation.createReviewSchema),
  reviewController.createReview,
);

// Lấy review của chính user (patient)
router.get(
  "/my",
  protect,
  restrictTo("patient"),
  validate(reviewValidation.getMyReviewsSchema),
  reviewController.getMyReviews,
);

// Lấy review công khai của bác sĩ (không cần auth)
router.get(
  "/doctors/:doctorId",
  validate(reviewValidation.getDoctorReviewsSchema),
  reviewController.getDoctorReviews,
);

// ==================== THÊM MỚI ====================
// Thống kê đánh giá cho bác sĩ (chỉ bác sĩ đã đăng nhập)
router.get(
  "/stats",
  protect,
  restrictTo("doctor"),
  validate(reviewValidation.getReviewStatsSchema),
  reviewController.getReviewStats,
);

export default router;
