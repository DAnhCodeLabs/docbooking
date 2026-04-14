import axios from "axios";

class AiService {
  static async askPythonEngine(messages) {
    // 1. CƠ CHẾ PHÒNG THỦ: Kiểm tra biến môi trường
    const aiUrl = process.env.PYTHON_AI_URL;
    if (!aiUrl) {
      console.error(
        "🔥 LỖI NGHIÊM TRỌNG: Chưa cấu hình biến PYTHON_AI_URL trong file .env",
      );
      throw new Error("Lỗi cấu hình hệ thống máy chủ AI.");
    }

    try {
      const payload = {
        messages: messages,
        temperature: 0.7,
      };

      // 2. GỌI API
      const response = await axios.post(aiUrl, payload);

      return response.data.choices[0].content[0].text;
    } catch (error) {
      // 3. LOG LỖI CHI TIẾT ĐỂ DEBUG
      if (error.response) {
        // Lỗi do Python trả về (ví dụ: 400, 500)
        console.error("❌ Python Server Error Data:", error.response.data);
        throw new Error("Dịch vụ Trợ lý AI đang gặp sự cố. Vui lòng thử lại.");
      } else if (error.request) {
        // Lỗi do không kết nối được (Python server chưa bật)
        console.error(
          "❌ Không thể kết nối tới Server Python (Cổng 8001). Hãy chắc chắn bạn đã bật main.py",
        );
        throw new Error("Hệ thống AI đang bảo trì.");
      } else {
        // Lỗi thiết lập Axios (như Invalid URL vừa rồi)
        console.error(`❌ Lỗi thiết lập Request: ${error.message}`);
        throw new Error("Lỗi kết nối nội bộ.");
      }
    }
  }
}

export default AiService;
