import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import Specialty from "../../../models/Specialty.js";
import ApiError from "../../../utils/ApiError.js";
import { parseQuery, extractLocation } from "./intentParser.js";
import { askPythonEngine } from "./AiService.js";

// Import các Module đã chia nhỏ
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

  // 2. ÉP XUNG HIỆU NĂNG: Khởi chạy TOÀN BỘ các tác vụ I/O song song
  const [activeSpecialties, existingSession, intentData, hospitals] =
    await Promise.all([
      Specialty.find({ status: "active" }).select("name description").lean(),
      ChatSession.findOne({ sessionId }),
      fetchIntentContext(parsed),
      parsed.intent === "search_service" ||
      (parsed.intent === "general_symptom" && detectedLocation)
        ? findHospitalsByContext(detectedLocation)
        : Promise.resolve([]),
    ]);

  const session =
    existingSession || new ChatSession({ sessionId, messages: [] });

  // 3. Trích xuất ngữ cảnh lịch sử
  const lastMsg = session.messages?.[session.messages.length - 1];
  const currentSpec =
    activeSpecialties.find((s) =>
      (lastMsg?.metadata || "").toLowerCase().includes(s.name.toLowerCase()),
    )?.name || "Nội tổng quát";

  // Cập nhật log phiên chat
  session.messages.push({ role: "user", content: [{ text: message }] });
  const history = session.messages
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content }));

  // 4. Xây dựng System Prompt (Sử dụng Object Mapping an toàn)
  const systemInstruction = buildAdaptivePrompt({
    specialties: activeSpecialties,
    hospitals,
    userLoc: detectedLocation,
    currentSpec,
    intent: parsed.intent,
    ...intentData, // Spread operator bung toàn bộ 6 properties từ fetchIntentContext
  });

  const payload = [
    { role: "system", content: [{ text: systemInstruction }] },
    ...history,
  ];

  // 5. Giao tiếp AI & Phản hồi
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
