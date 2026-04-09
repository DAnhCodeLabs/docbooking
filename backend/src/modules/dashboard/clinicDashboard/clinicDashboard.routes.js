import express from "express";
import { protect, restrictTo } from "../../../middlewares/auth.js";
import validate from "../../../middlewares/validate.js";
import { getClinicDashboard, getClinicReviewStats } from "./clinicDashboard.controller.js";
import { clinicDashboardQuerySchema, getClinicReviewStatsSchema } from "./clinicDashboard.validation.js";

const router = express.Router();

router.use(protect, restrictTo("clinic_admin"));

router.get(
  "/dashboard",
  validate(clinicDashboardQuerySchema),
  getClinicDashboard,
);

router.get(
  "/review-stats",
  validate(getClinicReviewStatsSchema),
  getClinicReviewStats,
);

export default router;
