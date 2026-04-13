import express from "express";
import { protect, restrictTo } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import * as adminValidation from "./admin.validation.js";
import * as adminController from "./admin.controller.js";
import * as dashboardController from "./dashboard/dashboard.controller.js";
import { dashboardQuerySchema } from "./dashboard/dashboard.validation.js";

const router = express.Router();

router.use(protect, restrictTo("admin"));

// Danh sách người dùng
router.get(
  "/users",
  validate(adminValidation.getUsersQuerySchema),
  adminController.getUsers,
);

// Xem chi tiết
router.get(
  "/users/:id",
  validate(adminValidation.userIdParamSchema),
  adminController.getUserById,
);

// Khóa tài khoản (hỗ trợ cả PUT và PATCH)
router
  .route("/users/:id/ban")
  .patch(validate(adminValidation.banUserSchema), adminController.banUser)
  .put(validate(adminValidation.banUserSchema), adminController.banUser);

// Mở khóa tài khoản
router
  .route("/users/:id/unban")
  .patch(validate(adminValidation.unbanUserSchema), adminController.unbanUser)
  .put(validate(adminValidation.unbanUserSchema), adminController.unbanUser);

// Xóa mềm
router
  .route("/users/:id")
  .delete(
    validate(adminValidation.userIdParamSchema),
    adminController.softDeleteUser,
  );


  router.get(
    "/dashboard",
    validate(dashboardQuerySchema),
    dashboardController.getDashboard,
);

router.get("/reviews", dashboardController.getReviewStatistics);

export default router;
