import ChatSession from "../../../models/ChatSession.js";
import AiService from "./AiService.js";
// Import các model dữ liệu của hệ thống
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ClinicLead from "../../../models/ClinicLead.js";
import Specialty from "../../../models/Specialty.js";

// --- HÀM HELPER: NHẬN DIỆN Ý ĐỊNH TÌM KIẾM ĐỊA ĐIỂM ---
const isAskingForLocation = (message) => {
  const keywords = [
    "ở đâu",
    "chỗ nào",
    "bệnh viện",
    "phòng khám",
    "địa chỉ",
    "cơ sở",
    "hà nội",
    "hồ chí minh",
    "hcm",
    "địa phương",
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword));
};

export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Yêu cầu cung cấp sessionId và message.");
  }

  // 1. TRUY XUẤT CHUYÊN KHOA (Luôn cần để chẩn đoán)
  const specialties = await Specialty.find().select("name").lean();
  const specialtyNames = specialties.map((s) => s.name).join(", ");

  // 2. TRUY XUẤT BỆNH VIỆN (Chỉ khi cần thiết)
  let clinicInfo = "";
  let clinicPromptInstruction = "";

  // Nếu câu hỏi của user có ý định tìm địa điểm khám
  if (isAskingForLocation(message)) {
    // Lấy danh sách (Trong tương lai có thể dùng Regex để lọc theo tỉnh thành user gõ)
    const clinics = await ClinicLead.find({ locked: { $ne: true } })
      .select("clinicName address")
      .limit(5) // CHỈ LẤY TỐI ĐA 5 CƠ SỞ ĐỂ TRÁNH SPAM
      .lean();

    clinicInfo = clinics
      .map((c) => `+ Tên: ${c.clinicName} | Địa chỉ: ${c.address}`)
      .join("\n");

    clinicPromptInstruction = `
        3. Người dùng đang hỏi về địa điểm khám. BẠN PHẢI tư vấn các cơ sở y tế trong danh sách [CƠ SỞ ĐỐI TÁC] bên dưới.
        4. PHẢI nêu rõ cả Tên và Địa chỉ. Nếu người dùng hỏi một tỉnh thành không có trong danh sách, hãy báo là hệ thống chưa có đối tác ở khu vực đó.`;
  } else {
    // Nếu chỉ hỏi bệnh lý thông thường
    clinicPromptInstruction = `
        3. Người dùng chỉ đang hỏi về bệnh lý hoặc thuốc. KHÔNG ĐƯỢC TỰ ĐỘNG liệt kê danh sách bệnh viện lúc này.
        4. Hãy chẩn đoán, khuyên họ đi khám chuyên khoa phù hợp và HỎI LẠI họ đang sinh sống ở tỉnh/thành phố nào để bạn có thể gợi ý cơ sở y tế gần nhất.`;
  }

  // 3. XÂY DỰNG SYSTEM PROMPT ĐỘNG
  const DYNAMIC_SYSTEM_PROMPT = `Bạn là chuyên viên y tế ảo của Booking Care.

    QUY TẮC PHẢN HỒI BẮT BUỘC:
    1. Tuyệt đối không kê đơn thuốc. Nếu khẩn cấp, khuyên gọi 115.
    2. Chỉ được khuyên khám các chuyên khoa có trong [CHUYÊN KHOA HỖ TRỢ].
    ${clinicPromptInstruction}

    [DỮ LIỆU HỆ THỐNG BOOKING CARE]:
    * [CHUYÊN KHOA HỖ TRỢ]: ${specialtyNames || "Đang cập nhật..."}
    ${clinicInfo ? `* [CƠ SỞ ĐỐI TÁC]:\n${clinicInfo}` : ""}
    `;

  // 4. QUẢN LÝ SESSION TRONG MONGODB
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = await ChatSession.create({ sessionId });
  }

  // Lưu tin nhắn User
  session.messages.push({ role: "user", content: [{ text: message }] });
  await session.save();

  // 5. CHUẨN BỊ PAYLOAD (Sliding Window 10 messages)
  const recentMessages = session.messages.slice(-10).map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content[0].text }],
  }));

  const payloadForPython = [
    { role: "system", content: [{ text: DYNAMIC_SYSTEM_PROMPT }] },
    ...recentMessages,
  ];

  // 6. GỌI PYTHON AI ENGINE
  const aiResponseText = await AiService.askPythonEngine(payloadForPython);

  // 7. LƯU PHẢN HỒI AI VÀO DB
  session.messages.push({
    role: "assistant",
    content: [{ text: aiResponseText }],
  });
  await session.save();

  // 8. TRẢ KẾT QUẢ
  res.status(StatusCodes.OK).json({
    status: "success",
    data: {
      sessionId: session.sessionId,
      reply: aiResponseText,
      messageCount: session.messages.length,
    },
  });
});
