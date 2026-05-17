import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import { parseQuery, extractLocation } from "./intentParser.js";
import { askPythonEngine } from "./AiService.js";
import { buildAdaptivePrompt } from "./chatPromptBuilder.js";
import {
  findHospitalsByContext,
  fetchIntentContext,
} from "./chatContextHandler.js";

export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;

  // 1. Phân tích NLP tĩnh
  const parsed = parseQuery(message);
  const detectedLocation = extractLocation(message);

  // 2. Lấy session hiện tại (hoặc tạo mới)
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = new ChatSession({ sessionId, messages: [] });
  }
  const lastMsg = session.messages?.[session.messages.length - 1];
  const lastMetadata = lastMsg?.metadata || null;

  // 3. Chạy các tác vụ I/O song song (không bao gồm session)
  const [activeSpecialties, intentData, hospitals] = await Promise.all([
    Specialty.find({ status: "active" }).select("name description").lean(),
    fetchIntentContext(parsed, lastMetadata),
    parsed.intent === "search_service" ||
    (parsed.intent === "general_symptom" && detectedLocation)
      ? findHospitalsByContext(detectedLocation)
      : Promise.resolve([]),
  ]);

  // 4. Xác định chuyên khoa gợi ý từ lịch sử
  const currentSpec =
    activeSpecialties.find((s) =>
      (lastMsg?.metadata || "").toLowerCase().includes(s.name.toLowerCase()),
    )?.name || "Nội tổng quát";

  // 5. Cập nhật lịch sử chat
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
    ...intentData, // chứa existenceResult, doctorInfo, bookingRequest, targetDoctorInfo, ...
  });

  const payload = [
    { role: "system", content: [{ text: systemInstruction }] },
    ...history,
  ];

  // 7. Gọi AI và xử lý phản hồi
  try {
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
