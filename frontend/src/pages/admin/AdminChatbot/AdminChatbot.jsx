import { images } from "@/assets";
import axiosClient from "@/services/axiosClient";
import {
  BulbOutlined,
  ClearOutlined,
  CopyOutlined,
  MenuOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Drawer,
  Input,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useEffect, useRef, useState } from "react";

const { Text } = Typography;

// ========== HÀM FORMAT MARKDOWN GIỐNG USER CHATBOT ==========
const formatMarkdownToHtml = (text) => {
  if (!text) return "";
  let html = text
    .replace(/\n/g, "<br/>") // xuống dòng
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // in đậm
    .replace(/\*(.*?)\*/g, "<em>$1</em>"); // in nghiêng

  // Xử lý danh sách: dòng bắt đầu bằng số + chấm hoặc dấu gạch ngang
  const lines = html.split("<br/>");
  let inList = false;
  let listType = null;
  const processedLines = [];

  for (let line of lines) {
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    const unorderedMatch = line.match(/^-\s+(.*)$/);
    if (orderedMatch) {
      if (!inList || listType !== "ol") {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push(
          '<ol style="margin:0.5rem 0; padding-left:1.5rem;">',
        );
        inList = true;
        listType = "ol";
      }
      processedLines.push(`<li>${orderedMatch[2]}</li>`);
    } else if (unorderedMatch) {
      if (!inList || listType !== "ul") {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push(
          '<ul style="margin:0.5rem 0; padding-left:1.5rem;">',
        );
        inList = true;
        listType = "ul";
      }
      processedLines.push(`<li>${unorderedMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      processedLines.push(line);
    }
  }
  if (inList) processedLines.push(`</${listType}>`);
  return processedLines.join("<br/>");
};
// ===========================================================

// Dữ liệu tin nhắn khởi tạo
const initialMessages = [
  {
    id: 1,
    role: "assistant",
    message:
      "Xin chào Quản trị viên! Tôi là trợ lý AI của DocGo Portal. Tôi có thể giúp bạn trích xuất báo cáo, tra cứu thông tin phòng khám, hoặc kiểm tra trạng thái phê duyệt bác sĩ. Bạn cần hỗ trợ gì hôm nay?",
    timestamp: new Date(),
  },
];

// Danh sách câu hỏi gợi ý nhanh
const quickPrompts = [
  "Thống kê doanh thu hôm nay",
  "Danh sách bác sĩ đang chờ duyệt",
  "Phòng khám nào có lịch hẹn nhiều nhất?",
  "Tóm tắt đánh giá của bệnh nhân",
];

const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `admin_${timestamp}_${random}`;
};
const AdminChatbot = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    // Không lưu vào localStorage
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageToBackend = async (messageText) => {
    if (!sessionId) throw new Error("Chưa có phiên chat");
    const response = await axiosClient.post("/admin/chat", {
      sessionId,
      message: messageText,
    });
    if (response?.success && response?.data?.reply) return response.data.reply;
    throw new Error("Phản hồi không hợp lệ");
  };

  const handleSendMessage = async (text) => {
    const messageToSend = typeof text === "string" ? text : inputValue;
    if (!messageToSend.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      message: messageToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const reply = await sendMessageToBackend(messageToSend);
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        message: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Admin chat error:", error);
      const errorMsg =
        error?.response?.data?.message || error.message || "Lỗi kết nối AI";
      message.error(errorMsg);
      const errorAssistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        message: `⚠️ Rất tiếc, không thể xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại sau.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    message.success("Đã sao chép");
  };

  const handleClearChat = () => {
    setMessages(initialMessages);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 m-0">
          <BulbOutlined className="text-amber-500" /> Gợi ý nhanh
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-0">
          Chọn một chủ đề để hỏi AI
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <div
            key={idx}
            onClick={() => {
              handleSendMessage(prompt);
              setDrawerVisible(false);
            }}
            className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 text-sm text-slate-700 font-medium"
          >
            {prompt}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-slate-100">
        <Button
          danger
          type="text"
          block
          icon={<ClearOutlined />}
          onClick={handleClearChat}
          className="flex! items-center! justify-center! rounded-lg! hover:bg-red-50!"
        >
          Xóa lịch sử chat
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="hidden lg:block w-80 border-r border-slate-200 bg-white shrink-0">
          <SidebarContent />
        </div>

        <Drawer
          title={<span className="font-bold text-slate-800">Công cụ AI</span>}
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="p-0!"
          styles={{ body: { padding: 0 } }}
        >
          <SidebarContent />
        </Drawer>

        <div className="flex-1 flex flex-col h-full bg-[#f8fafc]">
          <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                className="lg:hidden! flex! items-center! justify-center!"
              />
              <div className="relative">
                <Avatar
                  size={40}
                  className="bg-linear-to-br! from-blue-600! to-indigo-600! shadow-md!"
                  src={images.iconChatbot}
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 m-0 leading-tight">
                  DocGo Assistant
                </h1>
                <span className="text-xs text-green-600 font-medium">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 lg:gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <Avatar
                    size={36}
                    className="shrink-0 bg-blue-600!"
                    src={images.iconChatbot}
                  />
                )}
                <div
                  className={`flex flex-col gap-1 max-w-[85%] lg:max-w-[75%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* CHỈNH SỬA TẠI ĐÂY: Render HTML cho assistant, text thuần cho user */}
                  <div
                    className={`px-5 py-3.5 shadow-sm text-[15px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.message
                    ) : (
                      <div
                        className="bot-message"
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdownToHtml(msg.message),
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {msg.timestamp.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.role === "assistant" && (
                      <Tooltip title="Sao chép">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined className="text-[12px]" />}
                          onClick={() => handleCopyMessage(msg.message)}
                          className="text-slate-400! hover:text-blue-600! w-6! h-6! min-w-0! p-0!"
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
                {msg.role === "user" && (
                  <Avatar
                    size={36}
                    className="shrink-0 bg-slate-800!"
                    icon={<UserOutlined />}
                  />
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 lg:gap-4 justify-start">
                <Avatar
                  size={36}
                  className="shrink-0 bg-blue-600!"
                  src={images.iconChatbot}
                />
                <div className="px-5 py-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                  <Spin size="small" />
                  <Text className="text-sm! text-slate-500!">
                    AI đang suy nghĩ...
                  </Text>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
              <Input.TextArea
                placeholder="Nhập câu hỏi cho AI... (Shift + Enter để xuống dòng)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={loading}
                className="bg-slate-50! border-slate-200! hover:border-blue-400! focus:border-blue-500! rounded-xl! py-3! px-4! text-[15px]! shadow-none! custom-scrollbar"
              />
              <Tooltip title="Gửi tin nhắn">
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || loading}
                  loading={loading}
                  className="h-12! w-12! rounded-xl! bg-blue-600! hover:bg-blue-700! shadow-md! border-none! shrink-0! flex! items-center! justify-center!"
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        /* Style cho bot-message đảm bảo bullet và heading đẹp */
        .bot-message ul, .bot-message ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        .bot-message li {
          margin-bottom: 0.25rem;
        }
        .bot-message strong {
          font-weight: 600;
          color: #0f3b2d;
        }
      `}</style>
    </div>
  );
};

export default AdminChatbot;
