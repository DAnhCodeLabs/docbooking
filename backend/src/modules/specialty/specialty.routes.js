import express from "express";
import validate from "../../middlewares/validate.js";
import { protect, restrictTo } from "../../middlewares/auth.js";
import * as specialtyValidation from "./specialty.validation.js";
import * as specialtyController from "./specialty.controller.js";
import { parseSingleFile } from "../../middlewares/upload.js";

const router = express.Router();

// ==========================================
// 1. PUBLIC ROUTES (Ai cũng xem được)
// ==========================================

// Lấy danh sách (Bệnh nhân chỉ nên truyền thêm ?status=active trên Frontend)
router.get("/", specialtyController.getSpecialties);

// ==========================================
// 2. ADMIN ROUTES (Cần đăng nhập và có quyền admin)
// ==========================================
router.use(protect);
router.use(restrictTo("admin"));

// Thêm mới chuyên khoa (Có kèm upload ảnh)
// Chú ý thứ tự: Upload Ảnh -> Validate Chữ -> Gọi Controller
router.post(
  "/",
  parseSingleFile("image", { limits: { fileSize: 2 * 1024 * 1024 } }), // giới hạn 2MB
  validate(specialtyValidation.createSpecialtySchema),
  specialtyController.createSpecialty,
);

router.patch(
  "/:id",
  parseSingleFile("image", { limits: { fileSize: 2 * 1024 * 1024 } }),
  validate(specialtyValidation.updateSpecialtySchema),
  specialtyController.updateSpecialty,
);

// Vô hiệu hóa / Kích hoạt lại (Xóa mềm)
router.patch(
  "/:id/status",
  validate(specialtyValidation.toggleStatusSchema),
  specialtyController.toggleSpecialtyStatus,
);

export default router;
