// backend/src/modules/Ai/AdminChat/adminChatController.js

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import ChatSession from "../../../models/ChatSession.js";
import ApiError from "../../../utils/ApiError.js";
import { askPythonEngine } from "../ChatBot/AiService.js";
import { parseAdminQuery } from "./adminIntentParser.js";
import { fetchAdminContext } from "./adminContextHandler.js";
import { buildAdminPrompt } from "./adminPromptBuilder.js";

// Helper đọc metadata linh hoạt (giữ nguyên)
const getLastStatusFilterFromSession = (session) => {
  if (!session.messages || session.messages.length === 0) return null;
  // Duyệt ngược từ cuối lên, lấy message đầu tiên của assistant có metadata
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if (
      msg.role === "assistant" &&
      msg.metadata &&
      typeof msg.metadata === "string"
    ) {
      const meta = msg.metadata;
      if (/approved/i.test(meta)) return "approved";
      if (/pending/i.test(meta)) return "pending";
    }
  }
  return null;
};

export const processAdminChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  const adminId = req.user?._id;

  console.log("[DEBUG][processAdminChat] sessionId:", sessionId);
  console.log("[DEBUG][processAdminChat] message:", message);
  console.log("[DEBUG][processAdminChat] adminId:", adminId);

  if (!sessionId || !message?.trim()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Thiếu sessionId hoặc nội dung tin nhắn.",
    );
  }

  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    console.log("[DEBUG][processAdminChat] creating new session");
    session = new ChatSession({ sessionId, messages: [] });
  }
  if (adminId && !session.user) {
    session.user = adminId;
  }

  session.messages.push({ role: "user", content: [{ text: message }] });

  const lastStatus = getLastStatusFilterFromSession(session);
  console.log("[DEBUG][processAdminChat] lastStatus from session:", lastStatus);

  const parsed = parseAdminQuery(message);
  console.log("[DEBUG][processAdminChat] parsed intent:", parsed.intent);

  const context = await fetchAdminContext(parsed, lastStatus);
  console.log("[DEBUG][processAdminChat] context keys:", Object.keys(context));

  const systemPrompt = buildAdminPrompt(context);

  const payload = [
    { role: "system", content: [{ text: systemPrompt }] },
    ...session.messages
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const rawAiResponse = await askPythonEngine(payload);
    let finalReply = rawAiResponse;
    let stateSummary = `Admin intent: ${parsed.intent}`;

    try {
      const parsedData = JSON.parse(rawAiResponse);
      finalReply = parsedData.reply || rawAiResponse;
      stateSummary = parsedData.state_summary || stateSummary;
    } catch {
      console.warn("[AdminChat] AI JSON parse failed, fallback to raw text.");
    }

    session.messages.push({
      role: "assistant",
      content: [{ text: finalReply }],
      metadata: stateSummary,
    });

    await session.save();
    console.log(
      "[DEBUG][processAdminChat] reply sent, stateSummary:",
      stateSummary,
    );
    return res.status(StatusCodes.OK).json({
      success: true,
      data: { sessionId, reply: finalReply },
    });
  } catch (error) {
    console.error("[AdminChat] AI Engine Error:", error.message);
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Hệ thống AI đang bận, vui lòng thử lại sau.",
    );
  }
});
