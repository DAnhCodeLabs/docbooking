import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as appointmentController from "./appointment.controller.js";
import * as appointmentValidation from "./appointment.validation.js";

const router = express.Router();

// Tất cả route yêu cầu đăng nhập và role patient
router.use(protect, restrictTo("patient"));

router.post(
  "/",
  validate(appointmentValidation.createAppointmentSchema),
  appointmentController.createAppointment,
);
router.get("/my", appointmentController.getMyAppointments);
router.patch(
  "/:id/cancel",
  validate(appointmentValidation.cancelAppointmentSchema),
  appointmentController.cancelAppointment,
);
router.post(
  "/:id/checkin",
  validate(appointmentValidation.checkinAppointmentSchema),
  appointmentController.checkinAppointment,
);

export default router;
