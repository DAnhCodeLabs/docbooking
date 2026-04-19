import express from "express";
import { processChat } from "./chatController.js";
import { protect } from "../../../middlewares/auth.js";
import { processPrivateChat } from "./privateChatController.js";
import ApiError from "../../../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";
import rateLimit from "express-rate-limit";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Khung thời gian: 1 phút
  max: 15, // Giới hạn: Tối đa 15 tin nhắn / 1 phút / 1 IP
  standardHeaders: true, // Trả về header RateLimit-* chuẩn
  legacyHeaders: false, // Tắt các header X-RateLimit-* cũ
  handler: (req, res, next) => {
    // Nếu vi phạm, ném lỗi cho errorHandler.js xử lý tập trung
    next(
      new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        "Bạn đã gửi tin nhắn quá nhanh. Vui lòng đợi 1 phút rồi thử lại nhé.",
      ),
    );
  },
});

// =========================================================================
// LỚP BẢO VỆ 2: PAYLOAD SIZE LIMIT (CHỐNG TRÀN BỘ NHỚ & TỐN TOKEN AI)
// =========================================================================
const validatePayloadSize = (req, res, next) => {
  const { message } = req.body;

  // Giới hạn độ dài tin nhắn tối đa 500 ký tự (khoảng 100 từ)
  if (message && message.length > 500) {
    return next(
      new ApiError(
        StatusCodes.REQUEST_TOO_LONG,
        "Tin nhắn quá dài (tối đa 500 ký tự). Vui lòng chia nhỏ câu hỏi của bạn.",
      ),
    );
  }
  next();
};

// =========================================================================
// ĐĂNG KÝ ROUTES ĐÃ ĐƯỢC BẢO VỆ
// =========================================================================

// Route cho Khách vãng lai (Guest)
router.post(
  "/",
  chatLimiter, // Chặn IP spam
  validatePayloadSize, // Chặn văn bản dài
  processChat, // Chuyển vào Controller xử lý
);

// Route cho Người dùng đã đăng nhập (User)
router.post(
  "/private",
  protect, // Xác thực JWT (Middleware cũ giữ nguyên)
  chatLimiter, // Chặn IP spam
  validatePayloadSize, // Chặn văn bản dài
  processPrivateChat, // Chuyển vào Controller xử lý
);
export default router;
