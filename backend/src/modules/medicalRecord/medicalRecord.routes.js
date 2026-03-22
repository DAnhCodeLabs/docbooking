import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as medicalRecordController from "./medicalRecord.controller.js";
import * as medicalRecordValidation from "./medicalRecord.validation.js";

const router = express.Router();

// Tất cả route yêu cầu đăng nhập và role patient
router.use(protect, restrictTo("patient"));

router.get("/", medicalRecordController.getMedicalRecords);
router.post(
  "/",
  validate(medicalRecordValidation.createMedicalRecordSchema),
  medicalRecordController.createMedicalRecord,
);
router.patch(
  "/:id",
  validate(medicalRecordValidation.updateMedicalRecordSchema),
  medicalRecordController.updateMedicalRecord,
);
router.delete(
  "/:id",
  validate(medicalRecordValidation.deleteMedicalRecordSchema),
  medicalRecordController.deleteMedicalRecord,
);

export default router;
