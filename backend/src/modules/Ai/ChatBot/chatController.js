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
  const currentUser = req.user || null;

  console.log(
    `[DEBUG processChat] req: sessionId=${sessionId}, user=${currentUser?._id || "guest"}`,
  );

  // 1. Phân tích NLP Đồng Bộ (In-memory, O(1))
  const parsed = parseQuery(message);
  const detectedLocation = extractLocation(message);

  // 2. Truy xuất Session (I/O tuần tự duy nhất bắt buộc)
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = new ChatSession({ sessionId, messages: [] });
  }

  // Cập nhật quan hệ User trên RAM (Gom chung vào 1 lần write DB ở cuối)
  if (currentUser?._id && !session.user) {
    session.user = currentUser._id;
  }

  const lastMsg = session.messages[session.messages.length - 1];
  const lastMetadata = lastMsg?.metadata || null;

  // 3. I/O Song Song: Tối đa hóa Event Loop
  const requiresHospitalSearch =
    parsed.intent === "search_service" ||
    (parsed.intent === "general_symptom" && !!detectedLocation);

  const [activeSpecialties, intentData, hospitals] = await Promise.all([
    Specialty.find({ status: "active" }).select("name description").lean(),
    fetchIntentContext(parsed, lastMetadata, currentUser),
    requiresHospitalSearch
      ? findHospitalsByContext(detectedLocation)
      : Promise.resolve([]),
  ]);

  // 4. Tiền xử lý Context & Xây dựng Prompt
  const lowerLastMeta = lastMetadata ? lastMetadata.toLowerCase() : "";
  const currentSpec =
    activeSpecialties.find((s) => lowerLastMeta.includes(s.name.toLowerCase()))
      ?.name || "Nội tổng quát";

  // Cập nhật bộ nhớ hội thoại
  session.messages.push({ role: "user", content: [{ text: message }] });

  // Tối ưu hóa việc lọc History (chỉ lấy role và content để tránh rò rỉ metadata nội bộ của Mongoose)
  const history = session.messages
    .slice(-6)
    .map(({ role, content }) => ({ role, content }));

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
    ...intentData,
  });

  const payload = [
    { role: "system", content: [{ text: systemInstruction }] },
    ...history,
  ];

  // 5. Giao tiếp AI & Xử lý Fallback
  try {
    const rawAiResponse = await askPythonEngine(payload);
    let finalReply = rawAiResponse;
    let stateSummary = `Intent: ${parsed.intent} | Loc: ${detectedLocation || "none"} | Spec: ${currentSpec}`;

    // Tối ưu CPU: Chỉ Parse JSON nếu AI thực sự trả về chuỗi có định dạng JSON
    const trimmedResponse = rawAiResponse.trim();
    if (trimmedResponse.startsWith("{") || trimmedResponse.startsWith("[")) {
      try {
        const parsedData = JSON.parse(trimmedResponse);
        finalReply = parsedData.reply || rawAiResponse;
        stateSummary = parsedData.state_summary || stateSummary;
      } catch (jsonError) {
        console.warn(
          "[DEBUG processChat] JSON Parse failed, fallback to raw response.",
        );
      }
    }

    // 6. Cập nhật Session & Batch Write (Lưu DB đúng 1 lần)
    session.messages.push({
      role: "assistant",
      content: [{ text: finalReply }],
      metadata: stateSummary,
    });
    await session.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: { sessionId, reply: finalReply },
    });
  } catch (error) {
    console.error("[DEBUG processChat] AI Engine Error:", error.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Hệ thống y tế AI đang quá tải, vui lòng thử lại sau vài giây.",
    );
  }
});
