import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import ChatSession from "../../../models/ChatSession.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import AiService from "./AiService.js";
import { parsePatientQuery } from "./intentParser.js";
import * as patientDataService from "./patientDataService.js";

/**
 * HÀM XỬ LÝ LÕI RAG (BẢN CHUẨN SENIOR)
 */
export const handleAiRAGQuery = async (
  sessionId,
  message,
  userId = null,
  intentType = null,
) => {
  const lowerMsg = message.toLowerCase();

  // --- BƯỚC 1: QUẢN LÝ SESSION & BẢO MẬT ---
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    try {
      session = await ChatSession.create({
        sessionId,
        user: userId || null,
        messages: [],
      });
    } catch (err) {
      if (err.code === 11000)
        session = await ChatSession.findOne({ sessionId });
      else throw err;
    }
  } else {
    // Chặn truy cập trái phép nếu session đã thuộc về user khác
    if (
      session.user &&
      userId &&
      session.user.toString() !== userId.toString()
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền truy cập phiên chat này.",
      );
    }
    // Gán user cho khách vãng lai nếu họ vừa login
    if (!session.user && userId) session.user = userId;
  }

  // --- BƯỚC 2: PHÂN TÍCH Ý ĐỊNH (INTENT) ---
  // Ưu tiên intentType từ Controller (đã qua xử lý private) hoặc tự parse
  const parsedIntent = intentType
    ? { type: intentType, ...parsePatientQuery(message) }
    : parsePatientQuery(message);

  const currentIntent = parsedIntent.type;

  // Nhận diện các câu hỏi liên quan đến dữ liệu nhạy cảm
  const isPersonalQuery =
    ["medicalRecord", "appointment", "consultation", "payment"].includes(
      currentIntent,
    ) ||
    /hồ sơ|lịch sử|kết quả khám|toa thuốc|đơn thuốc|thanh toán|viện phí/i.test(
      lowerMsg,
    );

  // --- BƯỚC 3: THU THẬP TRI THỨC HỆ THỐNG (DOCTORS & CLINICS) ---
  let doctorInfoText = "(Không tìm thấy bác sĩ phù hợp)";
  let clinicInfoText = "(Không tìm thấy phòng khám phù hợp)";
  let specialtyNames = "";

  try {
    const allSpecialties = await Specialty.find({ status: "active" })
      .select("name")
      .lean();
    specialtyNames = allSpecialties.map((s) => s.name).join(", ");

    let targetedDoctors = [];
    // 3.1. Tìm đích danh bác sĩ nếu có tên trong câu hỏi
    if (parsedIntent.doctorName) {
      const users = await mongoose
        .model("User")
        .find({
          role: "doctor",
          status: "active",
          fullName: { $regex: parsedIntent.doctorName, $options: "i" },
        })
        .select("_id");

      if (users.length > 0) {
        targetedDoctors = await DoctorProfile.find({
          user: { $in: users.map((u) => u._id) },
          status: "active",
        })
          .populate("user", "fullName")
          .populate("specialty", "name")
          .populate("clinicId", "clinicName")
          .lean();
      }
    }

    // 3.2. Nếu không có tên bác sĩ, dùng Vector Search để tìm theo bệnh lý
    if (targetedDoctors.length === 0 && !isPersonalQuery) {
      const queryVector = await AiService.generateEmbedding(message);
      if (queryVector?.length === 768) {
        const vectorDocs = await DoctorProfile.aggregate([
          {
            $vectorSearch: {
              index: "vector_index_doctor",
              path: "embedding",
              queryVector,
              numCandidates: 100,
              limit: 3,
              filter: { status: "active" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "u",
            },
          },
          { $unwind: "$u" },
          {
            $lookup: {
              from: "specialties",
              localField: "specialty",
              foreignField: "_id",
              as: "s",
            },
          },
          { $unwind: "$s" },
          {
            $project: {
              experience: 1,
              consultationFee: 1,
              "u.fullName": 1,
              "s.name": 1,
              score: { $meta: "vectorSearchScore" },
            },
          },
        ]);
        targetedDoctors = vectorDocs.map((d) => ({
          user: { fullName: d.u.fullName },
          specialty: { name: d.s.name },
          experience: d.experience,
          consultationFee: d.consultationFee,
        }));
      }
    }

    if (targetedDoctors.length > 0) {
      doctorInfoText = targetedDoctors
        .map(
          (d, i) =>
            `${i + 1}. BS ${d.user?.fullName} (Khoa: ${d.specialty?.name}) - KN: ${d.experience} năm - Giá: ${d.consultationFee?.toLocaleString()}đ`,
        )
        .join("\n");
    }
  } catch (err) {
    console.error("Hybrid Search Error:", err.message);
  }

  // --- BƯỚC 4: TRÍCH XUẤT DỮ LIỆU CÁ NHÂN (XỬ LÝ LỖI TREO KHI HỎI THANH TOÁN/KẾT QUẢ) ---
  let privateContext = "";
  if (userId && isPersonalQuery) {
    try {
      const [records, appsResult] = await Promise.all([
        patientDataService.getMedicalRecords(userId),
        patientDataService.getAppointments(userId, {
          limit: 5,
          sort: "-createdAt",
        }),
      ]);

      privateContext = `[DỮ LIỆU CÁ NHÂN CỦA NGƯỜI DÙNG CHAT]:\n`;
      if (records?.length > 0) {
        privateContext += `* SỔ Y TẾ: ${records.map((r) => `${r.fullName} (${r.bloodGroup || "?"})`).join("; ")}\n`;
      }

      if (appsResult?.appointments?.length > 0) {
        privateContext += `* LỊCH SỬ 5 LỊCH HẸN GẦN NHẤT:\n`;
        for (const app of appsResult.appointments) {
          const date = new Date(app.slot?.startTime).toLocaleString("vi-VN");
          const payStatus =
            app.paymentStatus === "paid" ? "ĐÃ thanh toán" : "CHƯA thanh toán";
          let appLine = `  - [${date}] BS: ${app.doctor?.fullName} | Trạng thái: ${app.status} | Tài chính: ${payStatus}\n`;

          // Bổ sung dữ liệu chuyên sâu tùy theo Intent để tránh AI bị "đói" thông tin dẫn đến treo
          if (currentIntent === "payment" && app.paymentStatus === "paid") {
            const pay = await patientDataService.getPaymentByAppointmentId(
              app._id,
            );
            if (pay)
              appLine += `    > Chi tiết tiền: ${pay.amount?.toLocaleString()}đ | Mã giao dịch: ${pay.transactionNo}\n`;
          }

          if (currentIntent === "consultation" && app.status === "completed") {
            const cons =
              await patientDataService.getConsultationByAppointmentId(app._id);
            if (cons)
              appLine += `    > Kết quả: ${cons.diagnosis} | Đơn thuốc: ${cons.prescription.map((p) => p.drugName).join(", ")}\n`;
          }
          privateContext += appLine;
        }
      } else {
        privateContext += `* Bệnh nhân này chưa có lịch hẹn nào trên hệ thống.\n`;
      }
    } catch (err) {
      console.error("Personal Data Extraction Error:", err.message);
    }
  }

  // --- BƯỚC 5: LƯU TIN NHẮN NGƯỜI DÙNG (CHỈ 1 LẦN DUY NHẤT) ---
  session.messages.push({ role: "user", content: [{ text: message }] });
  await session.save();

  // --- BƯỚC 6: ĐÓNG GÓI PROMPT & GỌI PYTHON AI ---
  const SYSTEM_INSTRUCTION = `Bạn là Trợ lý Y tế Điều phối của DOCGO.
CHỈ THỊ: Dựa vào [DỮ LIỆU CUNG CẤP] để trả lời. Nếu không có dữ liệu về thanh toán/đơn thuốc, hãy báo là chưa ghi nhận. KHÔNG tự kê đơn.
[DỮ LIỆU CUNG CẤP]:
- Các Chuyên khoa: ${specialtyNames}
- Danh sách Bác sĩ gợi ý: \n${doctorInfoText}
${privateContext}`;

  // Lấy 3 tin nhắn gần nhất làm lịch sử để AI hiểu ngữ cảnh nối tiếp
  const history = session.messages.slice(-4).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messagesForAI = [
    { role: "system", content: [{ text: SYSTEM_INSTRUCTION }] },
    ...history,
  ];

  try {
    // Gọi Python Server với timeout: 0 như yêu cầu
    const rawAiResponse = await AiService.askPythonEngine(messagesForAI);
    let reply = "";
    let stateSummary = "";

    try {
      const parsed = JSON.parse(rawAiResponse);
      reply = parsed.reply;
      stateSummary = parsed.state_summary;
    } catch {
      reply = rawAiResponse; // Fallback nếu AI trả về text thuần
    }

    // --- BƯỚC 7: LƯU PHẢN HỒI CỦA AI ---
    session.messages.push({
      role: "assistant",
      content: [{ text: reply }],
      metadata: stateSummary,
    });
    await session.save();

    return { sessionId, reply };
  } catch (error) {
    console.error("AI Memory Flow Error:", error.message);
    return {
      sessionId,
      reply:
        "Hệ thống AI đang bận xử lý dữ liệu lâm sàng, vui lòng đợi trong giây lát.",
    };
  }
};

/**
 * Controller Public (Guest)
 */
export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Thiếu sessionId hoặc message.",
    );
  const result = await handleAiRAGQuery(sessionId, message, null, null);
  res.status(StatusCodes.OK).json({ success: true, data: result });
});
