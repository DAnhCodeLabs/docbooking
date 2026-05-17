import express from "express";
import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../utils/ApiError.js";
// ĐÃ XÓA: import { protect } từ auth.js
// ĐÃ XÓA: import { processPrivateChat }
import { processChat } from "./chatController.js";

const router = express.Router();

// ============================================================================
// 1. MIDDLEWARES BẢO VỆ (SECURITY & VALIDATION)
// ============================================================================
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        "Bạn thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại nhé.",
      ),
    );
  },
});

const validateChatPayload = (req, res, next) => {
  const { sessionId, message } = req.body;

  if (!sessionId) {
    return next(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        "Thiếu mã phiên làm việc (sessionId).",
      ),
    );
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return next(
      new ApiError(StatusCodes.BAD_REQUEST, "Nội dung tin nhắn không hợp lệ."),
    );
  }

  if (message.length > 500) {
    return next(
      new ApiError(
        StatusCodes.REQUEST_TOO_LONG,
        "Tin nhắn quá dài (tối đa 500 ký tự). Vui lòng chia nhỏ câu hỏi.",
      ),
    );
  }

  req.body.message = message.trim();
  next();
};

// ============================================================================
// 2. KẾT NỐI ROUTING (CHỈ CÒN DUY NHẤT LUỒNG KHÁCH VÃNG LAI)
// ============================================================================
router.post("/", chatLimiter, validateChatPayload, processChat);

export default router;
