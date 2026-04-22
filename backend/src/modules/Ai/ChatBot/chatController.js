import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import AiService from "./AiService.js";
import { parsePatientQuery } from "./intentParser.js";
import * as patientDataService from "./patientDataService.js";

// =====================================================================
// HÀM XỬ LÝ CHÍNH (MAIN CONTROLLER RAG)
// =====================================================================
export const handleAiRAGQuery = async (
  sessionId,
  message,
  userId = null,
  intentType = null,
) => {
  const lowerMsg = message.toLowerCase();
  console.log(
    `\n=================== 🚀 BẮT ĐẦU PHIÊN XỬ LÝ AI 🚀 ===================`,
  );
  console.log(
    `👤 [USER QUERY]: "${message}" | SessionID: ${sessionId.substring(0, 8)}... | UserID: ${userId || "Khách"}`,
  );

  // ---------------------------------------------------------------------
  // BƯỚC 1: XỬ LÝ DATABASE & SESSION (BẢO MẬT VÁCH NGĂN)
  // ---------------------------------------------------------------------
  console.log(`🛡️ [SECURITY]: Đang kiểm tra tính hợp lệ của Session...`);
  let session = await ChatSession.findOne({ sessionId });

  if (!session) {
    try {
      session = await ChatSession.create({
        sessionId,
        user: userId || null,
        messages: [],
      });
      console.log(`   -> Đã tạo Session mới thành công.`);
    } catch (err) {
      if (err.code === 11000)
        session = await ChatSession.findOne({ sessionId });
      else throw err;
    }
  } else {
    const isSessionGuest = !session.user;
    const isRequestGuest = !userId;

    if (isSessionGuest && !isRequestGuest) {
      session.user = userId;
      console.log(
        `   -> [SESSION CLAIM]: Chuyển quyền sở hữu Session cho User ${userId}`,
      );
    } else if (!isSessionGuest && isRequestGuest) {
      console.error(
        `❌ [SECURITY ALERT]: Sai lệch trạng thái Đăng nhập. Từ chối truy cập!`,
      );
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Phiên chat thuộc về tài khoản khác. Vui lòng tải lại trang.",
      );
    } else if (
      session.user &&
      userId &&
      session.user.toString() !== userId.toString()
    ) {
      console.error(
        `❌ [SECURITY ALERT]: User ID không khớp chủ sở hữu Session. Từ chối truy cập!`,
      );
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền truy cập phiên chat này.",
      );
    }
    console.log(`   -> Session hợp lệ. Chủ sở hữu xác thực thành công.`);
  }

  let historicalContext = "";
  if (session.messages?.length > 0) {
    const userMsgs = session.messages.filter((m) => m.role === "user");
    historicalContext = userMsgs
      .slice(-2)
      .map((m) => m.content[0]?.text || "")
      .join(" | ");
  }

  // ---------------------------------------------------------------------
  // BƯỚC 2: PHÂN TÍCH Ý ĐỊNH & ĐỊNH TUYẾN
  // ---------------------------------------------------------------------
  console.log(`🧭 [ROUTING]: Đang phân tích ngữ nghĩa câu hỏi...`);
  const parsedIntent = intentType
    ? { type: intentType }
    : parsePatientQuery(message);
  const currentIntent = parsedIntent.type;

  const isPersonalQuery =
    ["medicalRecord", "appointment", "consultation", "payment"].includes(
      currentIntent,
    ) ||
    /hồ sơ|lịch sử|kết quả khám|toa thuốc|đơn thuốc|thanh toán|viện phí/i.test(
      lowerMsg,
    );

  const isGreeting =
    /^(chào|hi|hello|alo|hey|ai đấy|bạn là ai|bot|nexus)/i.test(
      message.trim(),
    ) && message.split(/\s+/).length <= 20;

  const needsMedicalKnowledge = !isPersonalQuery && !isGreeting;

  // ---------------------------------------------------------------------
  // BƯỚC 3: THU THẬP DỮ LIỆU RAG (DATA GATHERING)
  // ---------------------------------------------------------------------
  let doctorInfoText = "(Không yêu cầu tìm bác sĩ)";
  let clinicInfoText = "(Không yêu cầu tìm phòng khám)";
  let privateContext = userId
    ? "(Không có yêu cầu trích xuất dữ liệu cá nhân)"
    : "";
  let specialtyNames = "";

  // 3.1. VECTOR SEARCH (Bác sĩ / Phòng khám)
  if (needsMedicalKnowledge) {
    console.log(
      `🔍 [VECTOR SEARCH]: Đang kết nối Google để mã hóa Embedding...`,
    );

    try {
      const allSpecialties = await Specialty.find({ status: "active" })
        .select("name")
        .lean();
      specialtyNames = allSpecialties.map((s) => s.name).join(", ");

      const searchQueryText = historicalContext
        ? `Ngữ cảnh: "${historicalContext}". Câu hỏi: "${message}"`
        : message;
      const queryVector = await AiService.generateEmbedding(searchQueryText);

      // [BẢN VÁ P1]: Chặn crash Atlas nếu queryVector trả về rỗng hoặc sai số chiều (bắt buộc 768)
      if (queryVector && queryVector.length === 768) {
        console.log(`   -> Kích hoạt Atlas Vector Search...`);
        const targetedDoctors = await DoctorProfile.aggregate([
          {
            $vectorSearch: {
              index: "vector_index_doctor",
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 100,
              limit: 10,
              filter: { status: "active" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: "$userDoc" },
          {
            $match: {
              "userDoc.status": "active",
              "userDoc.deactivatedAt": null,
            },
          },
          {
            $lookup: {
              from: "specialties",
              localField: "specialty",
              foreignField: "_id",
              as: "specialtyDoc",
            },
          },
          {
            $unwind: {
              path: "$specialtyDoc",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "clinicleads",
              localField: "clinicId",
              foreignField: "_id",
              as: "clinicDoc",
            },
          },
          { $unwind: { path: "$clinicDoc", preserveNullAndEmptyArrays: true } },
          { $set: { score: { $meta: "vectorSearchScore" } } },
          { $match: { score: { $gt: 0.4 } } },
          { $limit: 5 },
          {
            $project: {
              experience: 1,
              customClinicName: 1,
              user: { fullName: "$userDoc.fullName" },
              specialty: { name: "$specialtyDoc.name" },
              clinicId: { clinicName: "$clinicDoc.clinicName" },
              score: 1,
            },
          },
        ]);

        if (targetedDoctors.length > 0) {
          doctorInfoText = targetedDoctors
            .map((d, i) => {
              const clinic =
                d.clinicId?.clinicName ||
                d.customClinicName ||
                "Hệ thống DOCGO";
              return `${i + 1}. BS ${d.user?.fullName} (Khoa: ${d.specialty?.name}) - Làm việc tại: ${clinic} - KN: ${d.experience || 0} năm.`;
            })
            .join("\n");
        } else {
          doctorInfoText =
            "(Không tìm thấy bác sĩ phù hợp với triệu chứng này).";
        }
      } else {
        console.warn(
          `⚠️ [CẢNH BÁO AI]: Bỏ qua Vector Search do queryVector không hợp lệ.`,
        );
      }

      const isHanoi = /hà nội|hn|cầu giấy|đống đa/i.test(lowerMsg);
      const isHCM = /hồ chí minh|hcm|sài gòn|quận 1|quận 3|tân bình/i.test(
        lowerMsg,
      );
      const clinicQuery = { status: "resolved" };
      if (isHanoi) clinicQuery.address = { $regex: "Hà Nội|HN", $options: "i" };
      else if (isHCM)
        clinicQuery.address = { $regex: "Hồ Chí Minh|HCM", $options: "i" };

      const clinics = await ClinicLead.find(clinicQuery)
        .select("clinicName address")
        .limit(10)
        .lean();
      if (clinics.length > 0) {
        clinicInfoText = clinics
          .map((c) => `+ ${c.clinicName} (ĐC: ${c.address})`)
          .join("\n");
      }
    } catch (error) {
      console.error("❌ [LỖI VECTOR SEARCH]:", error.message);
    }
  }

  // 3.2. DỮ LIỆU CÁ NHÂN
  if (userId && isPersonalQuery) {
    console.log(
      `🗄️ [PRIVATE DATA]: Đang trích xuất dữ liệu Y tế & Lịch khám...`,
    );
    try {
      const [records, appsResult] = await Promise.all([
        patientDataService.getMedicalRecords(userId),
        patientDataService.getAppointments(userId, {
          limit: 3,
          sort: "-createdAt",
        }),
      ]);
      privateContext = `[THÔNG TIN CÁ NHÂN CỦA TÀI KHOẢN ĐANG CHAT]:\n`;
      let hasData = false;

      if (records?.length > 0) {
        hasData = true;
        privateContext +=
          `* SỔ Y TẾ: \n` +
          records
            .map(
              (r, i) =>
                `  ${i + 1}. Tên: ${r.fullName} | Nhóm máu: ${r.bloodGroup || "N/A"}`,
            )
            .join("\n") +
          "\n";
      }
      if (appsResult?.appointments?.length > 0) {
        hasData = true;
        privateContext +=
          `* LỊCH HẸN GẦN NHẤT: \n` +
          appsResult.appointments
            .map(
              (a) =>
                `  - Ngày: ${a.slot?.startTime}, Bác sĩ: ${a.doctor?.fullName}, Trạng thái: ${a.status}`,
            )
            .join("\n") +
          "\n";
      }
      if (!hasData)
        privateContext +=
          "(Hệ thống chưa ghi nhận hồ sơ y tế hay lịch hẹn nào.)\n";
    } catch (error) {
      console.error("❌ [LỖI PRIVATE DATA]:", error.message);
    }
  }

  // ---------------------------------------------------------------------
  // BƯỚC 4: LƯU TIN NHẮN GỐC VÀO DATABASE
  // ---------------------------------------------------------------------
  session.messages.push({ role: "user", content: [{ text: message }] });
  await session.save();
  console.log(`💾 [DATABASE]: Đã lưu tin nhắn của User.`);

  // ---------------------------------------------------------------------
  // BƯỚC 5: TÁCH BIỆT SYSTEM INSTRUCTION & CHUẨN HÓA MẢNG CHAT
  // ---------------------------------------------------------------------
  console.log(
    `🔧 [PRE-PROCESSING]: Đang tách biệt System Instruction chống Prompt Injection...`,
  );

  const normalizedMessages = [];
  // 1. System Instruction (Luôn cố định để giữ luật)
  const SYSTEM_INSTRUCTION = `[CHỈ THỊ DÀNH CHO AI - HỆ THỐNG DOCGO]:
Bạn là Trợ lý Điều phối Y tế (Healthcare Navigator) của DOCGO.
LƯU Ý PHÁP LÝ: Bạn KHÔNG chẩn đoán bệnh chính thức và KHÔNG kê đơn thuốc. Bạn chỉ cung cấp thông tin y khoa tham khảo và hỗ trợ kết nối bệnh nhân với bác sĩ.

[NGUYÊN TẮC TƯ VẤN BẮT BUỘC]:
1. TRUY VẤN HỒ SƠ: Nếu bệnh nhân hỏi thông tin cá nhân, CHỈ DÙNG dữ liệu trong mục [THÔNG TIN CÁ NHÂN CỦA TÀI KHOẢN ĐANG CHAT].
2. TƯ VẤN TRIỆU CHỨNG BỆNH LÝ (Bắt buộc theo 4 bước):
   - Bước 1: Giải thích ngắn gọn về triệu chứng.
   - Bước 2: Chỉ định đúng Chuyên khoa cần khám.
   - Bước 3: Nếu mục [DANH SÁCH BÁC SĨ] có dữ liệu, hãy giới thiệu 1-3 bác sĩ/phòng khám sát với bệnh lý nhất.
   - Bước 4: Chốt tư vấn (Hỏi khu vực hoặc gợi ý đặt lịch).

[DỮ LIỆU ĐƯỢC CUNG CẤP CHO PHIÊN NÀY]:
* CÁC CHUYÊN KHOA HIỆN CÓ: ${specialtyNames}
* DANH SÁCH BÁC SĨ (AI Lọc):
${doctorInfoText}
* CƠ SỞ Y TẾ:
${clinicInfoText}
${privateContext}`;
  normalizedMessages.push({
    role: "system",
    content: [{ text: SYSTEM_INSTRUCTION }],
  });

  // 2. [CẢI TIẾN]: Chỉ lấy 3 tin nhắn gần nhất (Cửa sổ trượt tối ưu)
  // Giúp AI nhớ câu hỏi trước nhưng không bị "ngợp" bởi câu trả lời cũ
  const historyWindow = session.messages.slice(-3);

  for (const msg of historyWindow) {
    const role = msg.role === "assistant" ? "assistant" : "user";

    // [THAY THẾ NGỮ NGHĨA]:
    // Nếu là AI, ta lấy 'metadata' (cốt lõi) thay vì 'text' (dài dòng)
    const contentText =
      role === "assistant" && msg.metadata
        ? `Trạng thái trước: ${msg.metadata}`
        : msg.content[0].text;

    normalizedMessages.push({ role, content: [{ text: contentText }] });
  }

  // ---------------------------------------------------------------------
  // BƯỚC 6: GỌI AI & XỬ LÝ TRÍ NHỚ NÉN
  // ---------------------------------------------------------------------
  let rawAiResponse = "";
  try {
    rawAiResponse = await AiService.askPythonEngine(normalizedMessages);

    // Parse JSON từ AI sinh ra
    const parsedData = JSON.parse(rawAiResponse);
    const { reply, state_summary } = parsedData;

    // Lưu User message vào DB (Tin nhắn hiện tại của User)
    session.messages.push({ role: "user", content: [{ text: message }] });

    // Lưu Assistant message kèm Metadata (Trí nhớ cốt lõi cho lượt sau)
    session.messages.push({
      role: "assistant",
      content: [{ text: reply }],
      metadata: state_summary, // <--- Đây là "hạt nhân" trí nhớ
    });

    await session.save();
    return { sessionId, reply };
  } catch (error) {
    console.error("❌ Lỗi AI Memory Flow:", error);
    return { sessionId, reply: "Hệ thống đang bận, vui lòng thử lại." };
  }
};

// =====================================================================
// ROUTER HANDLER
// =====================================================================
export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Thiếu dữ liệu sessionId hoặc message.",
    );

  const result = await handleAiRAGQuery(sessionId, message, null, null);
  res.status(StatusCodes.OK).json({ success: true, data: result });
});
