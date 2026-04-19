import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import AiService from "./AiService.js";
import * as patientDataService from "./patientDataService.js";

// =====================================================================
// [CORE ALGORITHM] - TÍNH ĐIỂM TƯƠNG ĐỒNG VECTOR (COSINE SIMILARITY)
// =====================================================================
const calculateCosineSimilarity = (vecA, vecB) => {
  if (
    !vecA ||
    !vecB ||
    vecA.length === 0 ||
    vecB.length === 0 ||
    vecA.length !== vecB.length
  )
    return 0;
  let dotProduct = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const handleAiRAGQuery = async (
  sessionId,
  message,
  userId = null,
  intentType = null,
) => {
  const lowerMsg = message.toLowerCase();

  // =====================================================================
  // BƯỚC 1: QUẢN LÝ PHIÊN CHAT & RÚT TRÍ NHỚ (NGỮ CẢNH LỊCH SỬ)
  // =====================================================================
  let session = await ChatSession.findOne({ sessionId });

  if (!session) {
    try {
      session = await ChatSession.create({
        sessionId,
        user: userId,
        messages: [],
      });
    } catch (err) {
      if (err.code === 11000)
        session = await ChatSession.findOne({ sessionId });
      else throw err;
    }
  } else {
    if (
      session.user &&
      session.user.toString() !== (userId?.toString() || null)
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Phiên trò chuyện không hợp lệ hoặc đã hết hạn.",
      );
    }
    if (!session.user && userId) session.user = userId;
  }

  // Rút trích 2 tin nhắn gần nhất của Bệnh nhân để AI không bị "mất trí nhớ"
  let historicalContext = "";
  if (session.messages && session.messages.length > 0) {
    const userMsgs = session.messages.filter((m) => m.role === "user");
    historicalContext = userMsgs
      .slice(-2)
      .map((m) => m.content[0].text)
      .join(" | ");
  }

  // =====================================================================
  // BƯỚC 2: TRUY XUẤT VECTOR CÓ NHẬN THỨC NGỮ CẢNH (CONTEXT-AWARE)
  // =====================================================================
  const allSpecialties = await Specialty.find({ status: "active" })
    .select("name")
    .lean();

  // Gộp ngữ cảnh để Vector Search hiểu được cả "Bệnh lý" lẫn "Yêu cầu phụ (kinh nghiệm/địa điểm)"
  const searchQueryText = historicalContext
    ? `Ngữ cảnh trước đó: "${historicalContext}". Câu hỏi hiện tại: "${message}"`
    : message;

  let targetedDoctors = [];
  try {
    const queryVector = await AiService.generateEmbedding(searchQueryText);

    // [CODE CHUẨN SCHEMA] - Populate chính xác trường clinicId
    const allActiveDoctors = await DoctorProfile.find({ status: "active" })
      .populate("user", "fullName")
      .populate("specialty", "name")
      .populate("clinicId", "clinicName") // <-- Lấy tên phòng khám từ bảng ClinicLead
      .select(
        "user specialty clinicId customClinicName experience consultationFee embedding",
      )
      .lean();

    if (queryVector.length > 0) {
      const scoredDoctors = allActiveDoctors.map((doc) => {
        const score = calculateCosineSimilarity(queryVector, doc.embedding);
        return { ...doc, score };
      });

      scoredDoctors.sort((a, b) => b.score - a.score);

      // Lọc Top 5 bác sĩ có điểm Cosine > 0.4
      targetedDoctors = scoredDoctors.filter((d) => d.score > 0.4).slice(0, 5);

      // --- LOG TERMINAL KIỂM CHỨNG ---
      console.log(`\n🤖 [VECTOR SEARCH TRUY VẤN]: "${searchQueryText}"`);
      if (targetedDoctors.length > 0) {
        targetedDoctors.forEach((d, i) =>
          console.log(
            `   🏆 Top ${i + 1}: BS ${d.user?.fullName || "N/A"} (Khoa: ${d.specialty?.name || "N/A"}) - Score: ${d.score.toFixed(4)}`,
          ),
        );
      }
      console.log(
        `=========================================================\n`,
      );
    }
  } catch (err) {
    console.error("Lỗi thuật toán Vector:", err);
  }

  // =====================================================================
  // BƯỚC 3: TRUY XUẤT ĐỊA LÝ & PHÒNG KHÁM VÀ ĐÓNG GÓI DỮ LIỆU
  // =====================================================================
  const isHanoi = /hà nội|hn|cầu giấy|đống đa/i.test(lowerMsg);
  const isHCM = /hồ chí minh|hcm|sài gòn|quận 1|quận 3|tân bình/i.test(
    lowerMsg,
  );
  const clinicQuery = { status: "resolved" }; // Chỉ lấy phòng khám đã duyệt
  if (isHanoi) clinicQuery.address = { $regex: "Hà Nội|HN", $options: "i" };
  else if (isHCM)
    clinicQuery.address = { $regex: "Hồ Chí Minh|HCM", $options: "i" };

  const clinics = await ClinicLead.find(clinicQuery)
    .select("clinicName address")
    .limit(10)
    .lean();

  const specialtyNames = allSpecialties.map((s) => s.name).join(", ");
  const clinicInfoText =
    clinics.length > 0
      ? clinics.map((c) => `+ ${c.clinicName} (${c.address})`).join("\n")
      : "(Chưa tìm thấy cơ sở y tế theo khu vực)";

  // [CODE CHUẨN SCHEMA] - Thuật toán ưu tiên hiển thị Tên Bệnh Viện
  const doctorInfoText =
    targetedDoctors.length > 0
      ? targetedDoctors
          .map((d, i) => {
            // Ưu tiên 1: Tên từ bảng ClinicLead. Ưu tiên 2: Tên custom bác sĩ tự điền. Mặc định: DOCGO
            const clinicName =
              d.clinicId?.clinicName || d.customClinicName || "Hệ thống DOCGO";

            return `${i + 1}. BS: ${d.user?.fullName || "N/A"} | Nơi làm việc: ${clinicName} | Khoa: ${d.specialty?.name || "N/A"} | KN: ${d.experience || 0} năm | Phí: ${(d.consultationFee || 0).toLocaleString("vi-VN")} VNĐ`;
          })
          .join("\n")
      : "(Hiện không có bác sĩ nào khớp hoàn toàn với triệu chứng/chuyên khoa này)";

  // =====================================================================
  // BƯỚC 4: TRUY XUẤT DỮ LIỆU CÁ NHÂN (PRIVATE CONTEXT)
  // =====================================================================
  let privateContext = "";
  if (userId) {
    privateContext = `\n[TRẠNG THÁI TÀI KHOẢN]: Đã đăng nhập.\n[DỮ LIỆU CÁ NHÂN (Tuyệt mật)]:\n`;
    const isMedicalQuery = intentType === "medicalRecord" || !intentType;
    const isAppointmentQuery = intentType === "appointment" || !intentType;
    const isConsultationQuery = intentType === "consultation" || !intentType;
    const isPaymentQuery = intentType === "payment" || !intentType;

    const [records, appsResult, latestCon, payments] = await Promise.all([
      isMedicalQuery ? patientDataService.getMedicalRecords(userId) : null,
      isAppointmentQuery
        ? patientDataService.getAppointments(userId, {
            limit: 3,
            sort: "-createdAt",
          })
        : null,
      isConsultationQuery && patientDataService.getLatestConsultation
        ? patientDataService.getLatestConsultation(userId)
        : null,
      isPaymentQuery && patientDataService.getPayments
        ? patientDataService.getPayments(userId, { limit: 3 })
        : null,
    ]);

    let hasData = false;
    if (records?.length > 0) {
      hasData = true;
      privateContext +=
        `* HỒ SƠ:\n` +
        records
          .map(
            (r, i) =>
              `  ${i + 1}. Tên: ${r.fullName} | Sinh: ${r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString("vi-VN") : "N/A"} | Nhóm máu: ${r.bloodGroup || "Chưa rõ"}`,
          )
          .join("\n") +
        "\n";
    }
    if (appsResult?.appointments?.length > 0) {
      hasData = true;
      privateContext +=
        `* LỊCH HẸN GẦN NHẤT:\n` +
        appsResult.appointments
          .map(
            (a, i) =>
              `  - Ngày ${a.slot?.startTime || "N/A"}, Bác sĩ: ${a.doctor?.fullName || "N/A"}, Trạng thái: ${a.status}`,
          )
          .join("\n") +
        "\n";
    }
    if (latestCon) {
      hasData = true;
      privateContext += `* KẾT QUẢ KHÁM GẦN NHẤT:\n  - Chẩn đoán: ${latestCon.diagnosis}\n`;
    }
    if (payments?.length > 0) {
      hasData = true;
      privateContext +=
        `* THANH TOÁN:\n` +
        payments
          .map(
            (p) =>
              `  - ${p.amount.toLocaleString("vi-VN")} VNĐ, Trạng thái: ${p.status}`,
          )
          .join("\n") +
        "\n";
    }
    if (!hasData)
      privateContext += `(Hệ thống chưa tìm thấy dữ liệu cá nhân nào)\n`;
  } else {
    privateContext = `\n[TRẠNG THÁI TÀI KHOẢN]: Khách vãng lai (Chưa đăng nhập).\n`;
  }

  // =====================================================================
  // BƯỚC 5: TẠO PROMPT VÀ GỌI AI ENGINE
  // =====================================================================
  const DYNAMIC_SYSTEM_PROMPT = `Bạn là trợ lý y tế thông minh, tận tâm của hệ thống DOCGO. Giọng điệu nhẹ nhàng, chuyên nghiệp, đồng cảm.
QUY TẮC BẮT BUỘC:
1. Không đọc to các thẻ kỹ thuật như [TRẠNG THÁI TÀI KHOẢN] hay [DỮ LIỆU CÁ NHÂN].
2. Tư vấn theo 4 bước: Đồng cảm -> Suy luận bệnh -> Gợi ý bác sĩ -> Hướng dẫn đặt lịch.
3. Khi giới thiệu Bác sĩ, BẮT BUỘC phải ghép nối và đọc rõ Bác sĩ đó đang làm việc tại Bệnh viện/Phòng khám nào (Nơi làm việc) dựa trên danh sách cung cấp bên dưới.

[DỮ LIỆU HỆ THỐNG]:
* CHUYÊN KHOA ĐANG HỖ TRỢ: ${specialtyNames}
* DANH SÁCH BÁC SĨ (Đã lọc theo ngữ cảnh Vector):
${doctorInfoText}
* HỆ THỐNG CƠ SỞ Y TẾ (Phù hợp vị trí khách hàng):
${clinicInfoText}
${privateContext}`;

  // Lưu tin nhắn người dùng
  session.messages.push({ role: "user", content: [{ text: message }] });
  await session.save();

  // Sliding Window: Lấy trí nhớ ngắn hạn
  const recentMessages = session.messages.slice(-10).map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content[0].text }],
  }));

  // Gọi AI
  const aiResponseText = await AiService.askPythonEngine([
    { role: "system", content: [{ text: DYNAMIC_SYSTEM_PROMPT }] },
    ...recentMessages,
  ]);

  // Lưu phản hồi
  session.messages.push({
    role: "assistant",
    content: [{ text: aiResponseText }],
  });
  await session.save();

  return {
    sessionId: session.sessionId,
    reply: aiResponseText,
    messageCount: session.messages.length,
  };
};

export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Yêu cầu cung cấp sessionId và message.",
    );
  const result = await handleAiRAGQuery(sessionId, message, null, null);
  res.status(StatusCodes.OK).json({ success: true, data: result });
});
