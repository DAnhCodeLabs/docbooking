import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import AuditLog from "../../../models/AuditLog.js";
import { parsePatientQuery } from "./intentParser.js";
import sendSuccess from "../../../utils/response.js";
import { handleAiRAGQuery } from "./chatController.js"; // Đổi tên hàm cho đúng bản chất

/**
 * REFACTORED: Xử lý chat riêng tư 100% bằng mô hình RAG
 * Tầng này chỉ lo Authentication, Logging, và Routing.
 */
export const processPrivateChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  const userId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "";

  // 1. Dùng NLP Regex nhẹ để lấy Intent -> Phục vụ cho AuditLog và Tối ưu truy vấn
  const intent = parsePatientQuery(message);

  // Ánh xạ Intent thành Action chuẩn của hệ thống
  const actionMap = {
    medicalRecord: "VIEW_MEDICAL_RECORD",
    appointment: "VIEW_APPOINTMENT_HISTORY",
    consultation: "VIEW_CONSULTATION",
    payment: "VIEW_PAYMENT",
  };

  // 2. GHI NHẬT KÝ KIỂM TOÁN (AUDIT LOG) - Bắt buộc phải có với dữ liệu Y tế
  if (intent.type && actionMap[intent.type]) {
    await AuditLog.create({
      userId,
      action: actionMap[intent.type],
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: {
        intentType: intent.type,
        message_preview: message.substring(0, 50),
      },
    });
  }

  // 3. ĐẨY SANG TRÁI TIM RAG (Truyền thêm intent.type để tối ưu RAG khỏi lấy thừa data)
  try {
    const result = await handleAiRAGQuery(
      sessionId,
      message,
      userId,
      intent.type,
    );
    return sendSuccess(res, StatusCodes.OK, result);
  } catch (error) {
    console.error("❌ Lỗi Hệ thống RAG Core:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Dịch vụ tư vấn AI hiện đang bận, vui lòng thử lại sau.",
    });
  }
});
