import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as appointmentController from "./appointment.controller.js";
import * as appointmentValidation from "./appointment.validation.js";

const router = express.Router();

// Route cho patient và clinic_admin (giữ nguyên quyền)
router.post(
  "/",
  protect,
  restrictTo("patient", "clinic_admin"),
  validate(appointmentValidation.createAppointmentSchema),
  appointmentController.createAppointment,
);
router.get(
  "/my",
  protect,
  restrictTo("patient", "clinic_admin"),
  validate(appointmentValidation.getMyAppointmentsSchema),
  appointmentController.getMyAppointments,
);
router.patch(
  "/:id/cancel",
  protect,
  restrictTo("patient", "doctor"),
  validate(appointmentValidation.cancelAppointmentSchema),
  appointmentController.cancelAppointment,
);

router.post(
  "/:id/checkin",
  protect,
  restrictTo("clinic_admin"),
  validate(appointmentValidation.checkinAppointmentSchema),
  appointmentController.checkinAppointment,
);

// Route cho admin, clinic_admin, doctor (quản lý danh sách & chi tiết)
router.get(
  "/",
  protect,
  restrictTo("admin", "clinic_admin", "doctor"),
  validate(appointmentValidation.getAppointmentsSchema),
  appointmentController.getAppointments,
);
router.get(
  "/:id",
  protect,
  restrictTo("admin", "clinic_admin", "doctor", "patient"),
  validate(appointmentValidation.getAppointmentByIdSchema),
  appointmentController.getAppointmentById,
);

router.patch(
  "/:id/complete",
  protect,
  restrictTo("doctor"),
  validate(appointmentValidation.completeAppointmentSchema),
  appointmentController.completeAppointment,
);

export default router;
