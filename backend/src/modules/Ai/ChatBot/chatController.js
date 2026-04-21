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

// ĐÃ XÓA: Hàm calculateCosineSimilarity bằng JS thuần (Giờ Atlas sẽ lo việc này)

// =====================================================================
// HÀM XỬ LÝ CHÍNH (MAIN CONTROLLER)
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
    // [FIX LỖI UX/LOGIC]: Chống chiếm đoạt & Chuyển giao Session mượt mà
    const isSessionGuest = !session.user;
    const isRequestGuest = !userId;

    if (isSessionGuest && !isRequestGuest) {
      // Khách vừa đăng nhập -> Claim (Chiếm hữu) session này cho user đó
      session.user = userId;
      console.log(
        `   -> [SESSION CLAIM]: Chuyển quyền sở hữu Session cho User ${userId}`,
      );
    } else if (!isSessionGuest && isRequestGuest) {
      // Session của User mà Khách đòi chat -> Chặn (Chống xem trộm)
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
      // Session của User A mà User B đòi chat -> Chặn
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

  // Lấy ngữ cảnh cũ (Tối đa 2 tin user gần nhất để Vector hiểu câu tiếp nối)
  let historicalContext = "";
  if (session.messages?.length > 0) {
    const userMsgs = session.messages.filter((m) => m.role === "user");
    historicalContext = userMsgs
      .slice(-2)
      .map((m) => m.content[0]?.text || "")
      .join(" | ");
  }

  // ---------------------------------------------------------------------
  // BƯỚC 2: PHÂN TÍCH Ý ĐỊNH & ĐỊNH TUYẾN (SEMANTIC ROUTING)
  // ---------------------------------------------------------------------
  console.log(`🧭 [ROUTING]: Đang phân tích ngữ nghĩa câu hỏi...`);
  const parsedIntent = intentType
    ? { type: intentType }
    : parsePatientQuery(message);
  const currentIntent = parsedIntent.type;

  // Nhận diện câu hỏi cá nhân
  const isPersonalQuery =
    ["medicalRecord", "appointment", "consultation", "payment"].includes(
      currentIntent,
    ) ||
    /hồ sơ|lịch sử|kết quả khám|toa thuốc|đơn thuốc|thanh toán|viện phí/i.test(
      lowerMsg,
    );

  // Nhận diện câu chào
  const isGreeting =
    /^(chào|hi|hello|alo|hey|ai đấy|bạn là ai|bot|nexus)/i.test(
      message.trim(),
    ) && message.split(/\s+/).length <= 20;

  // Quyết định chạy Vector
  const needsMedicalKnowledge = !isPersonalQuery && !isGreeting;

  console.log(`   -> Intent nội bộ: ${currentIntent || "Không có"}`);
  console.log(`   -> Yêu cầu cá nhân: ${isPersonalQuery ? "Có" : "Không"}`);
  console.log(
    `   -> Yêu cầu tra cứu Y khoa: ${needsMedicalKnowledge ? "Có" : "Không (Bỏ qua Vector)"}`,
  );

  // ---------------------------------------------------------------------
  // BƯỚC 3: THU THẬP DỮ LIỆU RAG (DATA GATHERING)
  // ---------------------------------------------------------------------
  let doctorInfoText = "(Không yêu cầu tìm bác sĩ)";
  let clinicInfoText = "(Không yêu cầu tìm phòng khám)";
  let privateContext = userId
    ? "(Không có yêu cầu trích xuất dữ liệu cá nhân)"
    : "";
  let specialtyNames = "";

  // 3.1. LUỒNG VECTOR SEARCH (Tìm Bác sĩ / Phòng khám)
  if (needsMedicalKnowledge) {
    console.log(
      `🔍 [VECTOR SEARCH]: Đang kết nối Google Gemini để mã hóa Embedding...`,
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

      if (queryVector.length > 0) {
        console.log(
          `   -> Mã hóa thành công (768 chiều). Bắt đầu kích hoạt Atlas Vector Search...`,
        );

        // [FIX NÚT THẮT HIỆU NĂNG & LỖ HỔNG AUDIT]: Dùng Atlas Vector Search Pipeline
        const targetedDoctors = await DoctorProfile.aggregate([
          {
            $vectorSearch: {
              index: "vector_index_doctor", // Tên Index vừa tạo trên Atlas
              path: "embedding",
              queryVector: queryVector,
              numCandidates: 100,
              limit: 10,
              filter: { status: "active" }, // Lọc nhanh bác sĩ active
            },
          },
          // Nối bảng Users để kiểm tra trạng thái tài khoản
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: "$userDoc" },
          // VÁ LỖ HỔNG (Audit): Chỉ lấy User không bị Ban hoặc Xóa mềm
          {
            $match: {
              "userDoc.status": "active",
              "userDoc.deactivatedAt": null,
            },
          },
          // Nối bảng Specialty
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
          // Nối bảng ClinicLead
          {
            $lookup: {
              from: "clinicleads",
              localField: "clinicId",
              foreignField: "_id",
              as: "clinicDoc",
            },
          },
          { $unwind: { path: "$clinicDoc", preserveNullAndEmptyArrays: true } },
          // Lấy điểm số Vector
          {
            $set: { score: { $meta: "vectorSearchScore" } },
          },
          // Lọc theo ngưỡng tin cậy > 0.4
          {
            $match: { score: { $gt: 0.4 } },
          },
          // Chỉ lấy Top 5
          { $limit: 5 },
          // Định hình lại output cho giống code cũ
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

        console.log(
          `   -> Tìm thấy ${targetedDoctors.length} ứng viên phù hợp bằng Atlas Vector Search.`,
        );

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
      }

      // Quét Phòng khám theo địa lý (LOGIC CŨ GIỮ NGUYÊN)
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
        console.log(
          `   -> Tìm thấy ${clinics.length} phòng khám ở khu vực yêu cầu.`,
        );
      }
    } catch (error) {
      console.error("❌ [LỖI VECTOR SEARCH]:", error.message);
    }
  }

  // 3.2. LUỒNG DỮ LIỆU CÁ NHÂN (LOGIC CŨ GIỮ NGUYÊN)
  if (userId && isPersonalQuery) {
    console.log(
      `🗄️ [PRIVATE DATA]: Đang trích xuất dữ liệu Y tế & Lịch khám của người dùng...`,
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
      console.log(`   -> Trích xuất dữ liệu cá nhân thành công.`);
    } catch (error) {
      console.error("❌ [LỖI PRIVATE DATA]:", error.message);
    }
  }

  // ---------------------------------------------------------------------
  // BƯỚC 4: LƯU TIN NHẮN GỐC VÀO DATABASE
  // ---------------------------------------------------------------------
  session.messages.push({ role: "user", content: [{ text: message }] });
  await session.save();
  console.log(`💾 [DATABASE]: Đã lưu tin nhắn của User vào MongoDB.`);

  // ---------------------------------------------------------------------
  // BƯỚC 5: CHUẨN HÓA MẢNG & BƠM NGỮ CẢNH (PROMPT INJECTION)
  // ---------------------------------------------------------------------
  console.log(
    `🔧 [PRE-PROCESSING]: Đang chuẩn hóa cấu trúc Role (Khắc phục lỗi Google 400)...`,
  );
  const rawRecent = session.messages.slice(-8); // Giữ bộ nhớ 8 tin
  const normalizedMessages = [];

  // Thuật toán gộp Role giống nhau liên tiếp
  for (const msg of rawRecent) {
    const role = msg.role === "assistant" ? "assistant" : "user";
    const text = msg.content[0]?.text || "";

    if (normalizedMessages.length === 0) {
      normalizedMessages.push({ role, content: [{ text }] });
    } else {
      const lastMsg = normalizedMessages[normalizedMessages.length - 1];
      if (lastMsg.role === role) {
        lastMsg.content[0].text += `\n\n${text}`;
      } else {
        normalizedMessages.push({ role, content: [{ text }] });
      }
    }
  }

  // KỊCH BẢN CHUYÊN GIA 4 BƯỚC
  const SYSTEM_INSTRUCTION = `[CHỈ THỊ DÀNH CHO AI - HỆ THỐNG DOCGO]:
Bạn là Trợ lý Điều phối Y tế (Healthcare Navigator) của DOCGO.
LƯU Ý PHÁP LÝ: Bạn KHÔNG chẩn đoán bệnh chính thức và KHÔNG kê đơn thuốc. Bạn chỉ cung cấp thông tin y khoa tham khảo và hỗ trợ kết nối bệnh nhân với bác sĩ.

[NGUYÊN TẮC TƯ VẤN BẮT BUỘC]:
1. TRUY VẤN HỒ SƠ: Nếu bệnh nhân hỏi thông tin cá nhân, CHỈ DÙNG dữ liệu trong mục [THÔNG TIN CÁ NHÂN CỦA TÀI KHOẢN ĐANG CHAT].
2. TƯ VẤN TRIỆU CHỨNG BỆNH LÝ (Bắt buộc theo 4 bước):
   - Bước 1: Giải thích ngắn gọn về triệu chứng.
   - Bước 2: Chỉ định đúng Chuyên khoa cần khám.
   - Bước 3: Nếu mục [DANH SÁCH BÁC SĨ] có dữ liệu, hãy giới thiệu 1-3 bác sĩ/phòng khám sát với bệnh lý nhất.
   - Bước 4: Chốt tư vấn (Luôn nằm ở cuối câu):
      + Nếu chưa biết bệnh nhân ở tỉnh/thành phố nào: "Bạn đang sinh sống ở khu vực nào (Hà Nội, TP.HCM...) để tôi gợi ý phòng khám gần nhất?"
      + Nếu đã biết vị trí: "Bạn có muốn tôi hỗ trợ đặt lịch với bác sĩ này không?"

[DỮ LIỆU ĐƯỢC CUNG CẤP CHO PHIÊN NÀY]:
* CÁC CHUYÊN KHOA HIỆN CÓ: ${specialtyNames}
* DANH SÁCH BÁC SĨ (AI Lọc):
${doctorInfoText}
* CƠ SỞ Y TẾ:
${clinicInfoText}
${privateContext}

[CÂU HỎI THỰC SỰ CỦA NGƯỜI DÙNG]:
${message}`;

  // [FIX LỖI CRASH PROMPT]: Đảm bảo an toàn khi nhồi System Instruction
  if (normalizedMessages.length > 0) {
    const lastIndex = normalizedMessages.length - 1;
    if (normalizedMessages[lastIndex].role === "user") {
      normalizedMessages[lastIndex].content[0].text = SYSTEM_INSTRUCTION;
    } else {
      normalizedMessages.push({
        role: "user",
        content: [{ text: SYSTEM_INSTRUCTION }],
      });
    }
  }

  console.log(
    `🧠 [TRÍ NHỚ AI]: Đã chuẩn hóa thành ${normalizedMessages.length} luồng (User/Assistant). Gửi Prompt sang Python...`,
  );

  // ---------------------------------------------------------------------
  // BƯỚC 6: GỌI AI VÀ LƯU KẾT QUẢ
  // ---------------------------------------------------------------------
  let aiResponseText = "";
  try {
    aiResponseText = await AiService.askPythonEngine(normalizedMessages);
    console.log(`🤖 [AI SUCCESS]: Nhận phản hồi thành công từ Python Engine!`);
  } catch (error) {
    console.error("🔥 [LỖI MẠNG AI ENGINE]:", error.message);
    aiResponseText =
      "Xin lỗi, hệ thống AI đang bảo trì hoặc đường truyền bị gián đoạn. Vui lòng thử lại sau giây lát.";
  }

  session.messages.push({
    role: "assistant",
    content: [{ text: aiResponseText }],
  });
  await session.save();
  console.log(`💾 [DATABASE]: Đã lưu phản hồi của AI vào MongoDB.`);
  console.log(
    `=================== 🏁 KẾT THÚC PHIÊN XỬ LÝ 🏁 ===================\n`,
  );

  return { sessionId: session.sessionId, reply: aiResponseText };
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
