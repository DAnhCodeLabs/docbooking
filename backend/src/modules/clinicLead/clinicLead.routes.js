import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import { singleFile } from "../../middlewares/upload.js";
import validate from "../../middlewares/validate.js";
import * as clinicLeadController from "./clinicLead.controller.js";
import * as clinicLeadValidation from "./clinicLead.validation.js";

const router = express.Router();

// Public
router.post(
  "/register",
  singleFile("image", { limits: { fileSize: 2 * 1024 * 1024 } }),
  validate(clinicLeadValidation.registerClinicSchema),
  clinicLeadController.registerClinicLead,
);

router.get("/active", clinicLeadController.getPublicClinics);

// Admin routes
router.use(protect, restrictTo("admin"));

router.get("/", clinicLeadController.getClinicLeads);

router.patch(
  "/:id/status",
  validate(clinicLeadValidation.updateClinicLeadStatusSchema),
  clinicLeadController.reviewClinicLead,
);

// THÊM: Khóa phòng khám
router.patch(
  "/:id/lock",
  validate(clinicLeadValidation.lockClinicSchema),
  clinicLeadController.lockClinic,
);

// THÊM: Mở khóa phòng khám
router.patch(
  "/:id/unlock",
  validate(clinicLeadValidation.unlockClinicSchema),
  clinicLeadController.unlockClinic,
);

// THÊM: Xóa mềm phòng khám
router.delete(
  "/:id",
  validate(clinicLeadValidation.softDeleteClinicSchema),
  clinicLeadController.softDeleteClinic,
);

export default router;
