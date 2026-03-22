import express from "express";
import rateLimit from "express-rate-limit";
import { protect, restrictTo } from "../../middlewares/auth.js";
import { parseFields, parseSingleFile } from "../../middlewares/upload.js";
import validate from "../../middlewares/validate.js";
import * as doctorController from "./doctor.controller.js";
import * as doctorValidation from "./doctor.validation.js";

const router = express.Router();

// ==================== PUBLIC ROUTES (tĩnh) ====================
router.get(
  "/",
  validate(doctorValidation.getPublicDoctorsSchema),
  doctorController.getPublicDoctors,
);

// ==================== CLINIC ADMIN ROUTES (tĩnh, phải đặt trước route động /:id) ====================
router.get(
  "/clinic",
  protect,
  restrictTo("clinic_admin"),
  validate(doctorValidation.getClinicDoctorsSchema),
  doctorController.getClinicDoctors,
);

router.get(
  "/clinic/:id",
  protect,
  restrictTo("clinic_admin"),
  validate(doctorValidation.getClinicDoctorDetailSchema),
  doctorController.getClinicDoctorDetail,
);

router.patch(
  "/:id/confirm",
  protect,
  restrictTo("clinic_admin"),
  validate(doctorValidation.confirmDoctorSchema),
  doctorController.confirmDoctor,
);

router.patch(
  "/:id/reject",
  protect,
  restrictTo("clinic_admin"),
  validate(doctorValidation.rejectDoctorByClinicSchema),
  doctorController.rejectDoctorByClinic,
);

// ==================== PROTECTED ROUTES (dành cho bác sĩ) ====================
router.get(
  "/profile",
  protect,
  restrictTo("doctor"),
  doctorController.getMyProfile,
);

router.patch(
  "/profile",
  protect,
  restrictTo("doctor"),
  validate(doctorValidation.updateProfileSchema),
  doctorController.updateProfile,
);

router.post(
  "/documents",
  protect,
  restrictTo("doctor"),
  parseSingleFile("document", { limits: { fileSize: 10 * 1024 * 1024 } }),
  doctorController.uploadDocument,
);

router.delete(
  "/documents/:publicId",
  protect,
  restrictTo("doctor"),
  validate(doctorValidation.deleteFileSchema),
  doctorController.deleteDocument,
);

router.post(
  "/activity-images",
  protect,
  restrictTo("doctor"),
  parseSingleFile("image", { limits: { fileSize: 10 * 1024 * 1024 } }),
  doctorController.uploadActivityImage,
);

router.delete(
  "/activity-images/:publicId",
  protect,
  restrictTo("doctor"),
  validate(doctorValidation.deleteFileSchema),
  doctorController.deleteActivityImage,
);

// ==================== ONBOARDING ROUTE (PUBLIC) ====================
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    statusCode: 429,
    message: "Bạn đã nộp hồ sơ quá nhiều lần. Vui lòng thử lại sau 1 giờ.",
  },
});

router.post(
  "/register",
  onboardingLimiter,
  parseFields(
    [
      { name: "avatarUrl", maxCount: 1 },
      { name: "uploadedDocuments", maxCount: 10 },
    ],
    { limits: { fileSize: 10 * 1024 * 1024 } },
  ),
  validate(doctorValidation.registerDoctorSchema),
  doctorController.registerDoctor,
);

// ==================== PUBLIC ROUTE ĐỘNG (ĐẶT CUỐI CÙNG) ====================
router.get(
  "/:id",
  validate(doctorValidation.doctorIdParamSchema),
  doctorController.getPublicDoctorById,
);

export default router;
