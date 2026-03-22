import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as leaveController from "./leave.controller.js";
import * as leaveValidation from "./leave.validation.js";

const router = express.Router();

// Chỉ bác sĩ mới được thao tác nghỉ phép cho bản thân họ
router.use(protect, restrictTo("doctor"));

router.post(
  "/",
  validate(leaveValidation.createLeaveSchema),
  leaveController.createLeave,
);

router.get("/", leaveController.getLeaves);

router.patch(
  "/:id/cancel",
  validate(leaveValidation.cancelLeaveSchema),
  leaveController.cancelLeave,
);

export default router;
