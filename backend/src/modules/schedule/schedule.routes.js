import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as scheduleController from "./schedule.controller.js";
import * as scheduleValidation from "./schedule.validation.js";

const router = express.Router();

// Tất cả các route quản lý lịch đều cần đăng nhập
router.use(protect);

// 1. TẠO LỊCH (Bác sĩ hoặc Admin)
router.post(
  "/",
  restrictTo("doctor"),
  validate(scheduleValidation.createScheduleSchema),
  scheduleController.createSchedule,
);

// 2. KHÓA / MỞ KHÓA CA KHÁM (Bác sĩ hoặc Admin)
router.patch(
  "/slots/:id/toggle",
  restrictTo("doctor"),
  validate(scheduleValidation.toggleSlotSchema),
  scheduleController.toggleSlotStatus,
);

// Lấy danh sách lịch làm việc (Dành cho Admin và Doctor)
router.get(
  "/",
  restrictTo("admin", "doctor", "patient"),
  validate(scheduleValidation.getSchedulesSchema),
  scheduleController.getSchedules,
);

// Lấy chi tiết các Slot trong 1 ngày làm việc
router.get(
  "/:id/slots",
  restrictTo("admin", "doctor", "patient"),
  validate(scheduleValidation.getScheduleSlotsSchema),
  scheduleController.getScheduleSlots,
);

export default router;
