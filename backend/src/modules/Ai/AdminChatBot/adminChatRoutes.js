
import express from "express";
import { processAdminChat } from "./adminChatController.js";
import { protect, restrictTo } from "../../../middlewares/auth.js";

const adminChatRoutes = express.Router();

// Áp dụng protect và chỉ admin mới được dùng
adminChatRoutes.post("/", protect, restrictTo("admin"), processAdminChat);

export default adminChatRoutes;
