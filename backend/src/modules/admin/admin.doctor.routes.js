import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as adminDoctorController from "./admin.doctor.controller.js";
import * as adminValidation from "./admin.validation.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));

// ==================== QUẢN LÝ HỒ SƠ BÁC SĨ ====================

// Lấy danh sách hồ sơ (mặc định lấy Pending)
router.get(
  "/doctor-applications",
  validate(adminValidation.getDoctorApplicationsSchema),
  adminDoctorController.getDoctorApplications,
);

// Xem chi tiết hồ sơ (kèm các URL của tài liệu, bằng cấp)
router.get(
  "/doctor-applications/:id",
  validate(adminValidation.userIdParamSchema),
  adminDoctorController.getDoctorApplicationById,
);

// Duyệt hoặc Từ chối hồ sơ
router.patch(
  "/doctor-applications/:id/process",
  validate(adminValidation.processDoctorApplicationSchema),
  adminDoctorController.processDoctorApplication,
);

export default router;
