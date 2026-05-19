// ============================================================
// backend/src/modules/Ai/ChatBot/chatController.js
// ============================================================
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import { askPythonEngine } from "./AiService.js";
import {
  fetchIntentContext,
  findHospitalsByContext,
} from "./chatContextHandler.js";
import { buildAdaptivePrompt } from "./chatPromptBuilder.js";
import { extractLocation, parseQuery } from "./intentParser.js";

export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  const currentUser = req.user || null; // từ optionalAuth middleware

  console.log(
    `[DEBUG processChat] sessionId: ${sessionId}, message: "${message}", user: ${currentUser?._id || "guest"}`,
  );

  // 1. Phân tích câu hỏi
  const parsed = parseQuery(message);
  const detectedLocation = extractLocation(message);
  console.log(
    `[DEBUG processChat] parsed intent: ${parsed.intent}, targetDate: ${parsed.targetDate}, doctorName: ${parsed.doctorName}`,
  );

  // 2. Lấy hoặc tạo session
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = new ChatSession({ sessionId, messages: [] });
    console.log(`[DEBUG processChat] Created new session`);
  }

  // Nếu user đã đăng nhập và session chưa gán user -> gán
  if (currentUser && currentUser._id && !session.user) {
    session.user = currentUser._id;
    await session.save();
    console.log(
      `[DEBUG processChat] Linked session to user ${currentUser._id}`,
    );
  }

  const lastMsg = session.messages?.[session.messages.length - 1];
  const lastMetadata = lastMsg?.metadata || null;

  // 3. Chạy song song các tác vụ I/O
  const [activeSpecialties, intentData, hospitals] = await Promise.all([
    Specialty.find({ status: "active" }).select("name description").lean(),
    fetchIntentContext(parsed, lastMetadata, currentUser),
    parsed.intent === "search_service" ||
    (parsed.intent === "general_symptom" && detectedLocation)
      ? findHospitalsByContext(detectedLocation)
      : Promise.resolve([]),
  ]);

  console.log(
    `[DEBUG processChat] intentData received:`,
    JSON.stringify(intentData, null, 2),
  );

  // 4. Xác định chuyên khoa gợi ý từ lịch sử
  const currentSpec =
    activeSpecialties.find((s) =>
      (lastMsg?.metadata || "").toLowerCase().includes(s.name.toLowerCase()),
    )?.name || "Nội tổng quát";

  // 5. Lưu tin nhắn của user
  session.messages.push({ role: "user", content: [{ text: message }] });
  const history = session.messages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 6. Xây dựng System Prompt
  const systemInstruction = buildAdaptivePrompt({
    specialties: activeSpecialties,
    hospitals,
    userLoc: detectedLocation,
    currentSpec,
    intent: parsed.intent,
    lastMetadata,
    userLoggedIn: !!currentUser,
    filterDoctorName: parsed.doctorName || null,
    filterDate: parsed.targetDate || null,
    ...intentData, // chứa personalData, doctorInfo, clinicInfo, v.v.
  });

  const payload = [
    { role: "system", content: [{ text: systemInstruction }] },
    ...history,
  ];

  // 7. Gọi AI và xử lý phản hồi
  try {
    console.log(
      `[DEBUG processChat] Calling AI with payload length: ${payload.length}`,
    );
    const rawAiResponse = await askPythonEngine(payload);
    let finalReply = rawAiResponse;
    let stateSummary = `Intent: ${parsed.intent} | Loc: ${detectedLocation} | Spec: ${currentSpec}`;

    try {
      const parsedData = JSON.parse(rawAiResponse);
      finalReply = parsedData.reply || rawAiResponse;
      stateSummary = parsedData.state_summary || stateSummary;
    } catch (e) {
      console.warn("JSON Parse Fallback activated.");
    }

    session.messages.push({
      role: "assistant",
      content: [{ text: finalReply }],
      metadata: stateSummary,
    });
    await session.save();

    console.log(`[DEBUG processChat] Response sent, session updated`);
    return res
      .status(StatusCodes.OK)
      .json({ success: true, data: { sessionId, reply: finalReply } });
  } catch (error) {
    console.error("Chat AI error:", error.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Hệ thống đang bận, vui lòng thử lại sau.",
    );
  }
});
