import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import AuditLog from "../../../models/AuditLog.js";
import sendSuccess from "../../../utils/response.js";
import ApiError from "../../../utils/ApiError.js";
import { handleAiRAGQuery } from "./chatController.js";
import { parsePatientQuery } from "./intentParser.js";

/**
 * [REFACTORED] Private Chat Controller
 * Tầng điều phối: Xử lý Xác thực, Validation, Ghi nhật ký kiểm toán (Audit Log)
 * và kích hoạt lõi RAG cho người dùng đã đăng nhập.
 */

// 1. CẤU HÌNH SCHEMA VALIDATION (Dùng Zod để đảm bảo dữ liệu đầu vào sạch)
const privateChatSchema = z.object({
  sessionId: z
    .string()
    .uuid({ message: "Mã phiên làm việc (Session ID) không hợp lệ." }),
  message: z
    .string()
    .min(1, "Nội dung tin nhắn không được để trống.")
    .max(500, "Tin nhắn vượt quá giới hạn 500 ký tự."),
});

export const processPrivateChat = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  console.log(
    `\n🔐 [PrivateChat] Bắt đầu xử lý yêu cầu từ User: ${req.user?._id}`,
  );

  // 2. VALIDATION ĐẦU VÀO
  const validation = privateChatSchema.safeParse(req.body);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map((e) => e.message).join(", ");
    console.warn(`⚠️ [PrivateChat] Dữ liệu không hợp lệ: ${errorMsg}`);
    throw new ApiError(StatusCodes.BAD_REQUEST, errorMsg);
  }

  const { sessionId, message } = validation.data;
  const userId = req.user._id;
  const ipAddress =
    req.ip || req.get("x-forwarded-for") || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "Unknown Device";

  // 3. PHÂN TÍCH Ý ĐỊNH (INTENT PARSING) - Chạy 1 lần duy nhất ở đây
  const intent = parsePatientQuery(message);
  console.log(`🎯 [PrivateChat] Intent detected: ${intent.type || "General"}`);

  // 4. ÁNH XẠ HÀNH ĐỘNG KIỂM TOÁN (AUDIT ACTION MAPPING)
  const ACTION_MAP = {
    medicalRecord: "VIEW_MEDICAL_RECORD",
    appointment: "VIEW_APPOINTMENT_HISTORY",
    consultation: "VIEW_CONSULTATION",
    payment: "VIEW_PAYMENT",
    symptom: "VIEW_CONSULTATION",
    prescription_request: "VIEW_CONSULTATION",
    hospital: "VIEW_CLINIC_INFO",
    off_topic: "OFF_TOPIC_QUERY",
  };

  const auditAction = ACTION_MAP[intent.type];

  // 5. KÍCH HOẠT LÕI RAG (TRÁI TIM HỆ THỐNG)
  try {
    const result = await handleAiRAGQuery(
      sessionId,
      message,
      userId,
      intent.type, // Truyền intent đã parse vào để RAG không phải parse lại
    );

    // 6. GHI LOG KIỂM TOÁN KHI THÀNH CÔNG (Chỉ ghi các hành động tra cứu nhạy cảm)
    if (auditAction) {
      // Fire-and-forget: Không dùng await để response trả về cho user nhanh nhất
      AuditLog.create({
        userId,
        action: auditAction,
        status: "SUCCESS",
        ipAddress,
        userAgent,
        details: {
          sessionId,
          intentType: intent.type,
          processingTime: `${Date.now() - startTime}ms`,
        },
      }).catch((err) =>
        console.error("🚨 [PrivateChat] AuditLog Error:", err.message),
      );
    }

    return sendSuccess(res, StatusCodes.OK, result);
  } catch (error) {
    console.error(`❌ [PrivateChat] Lỗi thực thi RAG: ${error.message}`);

    // Ghi log thất bại nếu có hành động nhạy cảm
    if (auditAction) {
      AuditLog.create({
        userId,
        action: auditAction,
        status: "FAILURE",
        ipAddress,
        userAgent,
        details: { error: error.message },
      }).catch(() => {});
    }

    // Đưa lỗi sang middleware xử lý tập trung
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Hệ thống AI đang bận xử lý dữ liệu, vui lòng thử lại sau.",
    );
  }
});
