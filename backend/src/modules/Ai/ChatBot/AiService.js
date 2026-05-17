import axios from "axios";
import http from "http";
import https from "https";

// 1. TỐI ƯU HÓA NETWORK (CONNECTION POOLING)
// Tái sử dụng kết nối TCP để giảm độ trễ tối đa khi liên lạc với Python Server & Google
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const apiClient = axios.create({
  httpAgent,
  httpsAgent,
});

/**
 * Giao tiếp với lõi LLM Python Server
 * @param {Array} messages - Mảng lịch sử chat và context (Chứa System Prompt)
 * @returns {Promise<string>} - Chuỗi JSON String từ Python
 */
export const askPythonEngine = async (messages) => {
  const aiUrl = process.env.PYTHON_AI_URL;
  if (!aiUrl) throw new Error("ENV_MISSING_PYTHON_URL");

  try {
    // Đã Tăng Timeout lên 180s (3 phút).
    // Đủ lâu để Python retry Gemini nhiều lần, nhưng đủ an toàn để không sập RAM Node.js
    const response = await apiClient.post(
      aiUrl,
      { messages, temperature: 0.7 },
      { timeout: 180000 },
    );

    const text = response.data?.choices?.[0]?.content?.[0]?.text;
    if (!text) throw new Error("INVALID_PAYLOAD_FROM_PYTHON");

    return text;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      // Khi ném lỗi này, Controller phía trên sẽ bắt và báo cho user:
      // "Hệ thống AI đang quá tải, vui lòng thử lại sau vài phút."
      throw new Error("AI_TIMEOUT");
    }
    if (error.response) {
      throw new Error(`AI_SERVER_ERROR_${error.response.status}`);
    }
    throw new Error("AI_CONNECTION_FAILED");
  }
};

/**
 * Tạo Vector Embedding 768 chiều từ Google Gemini
 * @param {string} text - Văn bản cần mã hóa
 * @returns {Promise<number[]>} - Mảng Vector hoặc mảng rỗng nếu lỗi
 */
export const generateEmbedding = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return []; // Fallback an toàn, tắt tính năng Semantic Search

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const payload = {
    model: "models/gemini-embedding-001",
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  };

  // Cơ chế Retry đơn giản, hiệu quả cho Production
  let attempts = 0;
  while (attempts < 2) {
    try {
      // Timeout 10s: Embedding bắt buộc phải chạy nhanh, không được nghẽn
      const response = await apiClient.post(url, payload, { timeout: 10000 });
      const vector = response.data?.embedding?.values;

      if (vector?.length === 768) return vector;
      return []; // Payload lỗi từ Google -> Trả mảng rỗng
    } catch (error) {
      attempts++;
      if (attempts >= 2) {
        console.error(`[AiService] Gemini Embedding Failed: ${error.message}`);
        return []; // Hết lượt retry -> Chấp nhận tìm kiếm chay (Keyword search)
      }
      // Nghỉ 1 giây trước khi thử lại
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};
