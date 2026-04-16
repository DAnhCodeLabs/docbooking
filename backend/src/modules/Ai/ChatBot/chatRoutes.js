import express from "express";
import { processChat } from "./chatController.js";
import { protect } from "../../../middlewares/auth.js";
import { processPrivateChat } from "./privateChatController.js";
// import { protect } from '../middlewares/auth.js'; // Mở comment nếu muốn bắt buộc user đăng nhập

const router = express.Router();

// Nếu cho phép Guest (Khách chưa đăng nhập) chat
router.post("/", processChat);
router.post("/private", protect, processPrivateChat);

export default router;
