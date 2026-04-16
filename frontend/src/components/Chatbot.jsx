import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Avatar, Dropdown, Tooltip, Badge, Tag } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SendOutlined,
  PaperClipOutlined,
  MinusOutlined,
  ExpandOutlined,
  CompressOutlined,
  CalendarOutlined,
  FileProtectOutlined,
  CreditCardOutlined,
  HeartFilled,
  SafetyCertificateFilled,
  HistoryOutlined,
} from '@ant-design/icons';
import { images } from '@/assets';
import { httpPost } from '@/services/http';
import { useAuthStore } from '@/stores/authStore';
import axiosClient from '@/services/axiosClient';

// Hàm chuyển markdown đơn giản sang HTML an toàn (chỉ cho phép các tag cơ bản)
const formatMarkdownToHtml = (text) => {
  if (!text) return '';
  let html = text
    .replace(/\n/g, '<br/>') // xuống dòng
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // in đậm
    .replace(/\*(.*?)\*/g, '<em>$1</em>'); // in nghiêng
  // Xử lý danh sách đơn giản: dòng bắt đầu bằng số + chấm hoặc dấu gạch ngang
  // Chú ý: không lồng nhau, chỉ xử lý toàn bộ khối
  const lines = html.split('<br/>');
  let inList = false;
  let listType = null;
  const processedLines = [];
  for (let line of lines) {
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    const unorderedMatch = line.match(/^-\s+(.*)$/);
    if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push(
          '<ol style="margin:0.5rem 0; padding-left:1.5rem;">'
        );
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${orderedMatch[2]}</li>`);
    } else if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push(
          '<ul style="margin:0.5rem 0; padding-left:1.5rem;">'
        );
        inList = true;
        listType = 'ul';
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
  return processedLines.join('<br/>');
};

const MedicalChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  // Tạo hoặc lấy sessionId từ localStorage
  const [sessionId] = useState(() => {
    let stored = localStorage.getItem('chatSessionId');
    if (!stored) {
      stored = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
      localStorage.setItem('chatSessionId', stored);
    }
    return stored;
  });

  const medicalServices = [
    {
      icon: <CalendarOutlined />,
      label: 'Đặt lịch',
      desc: 'Chọn bác sĩ',
      value: 'Tôi muốn đăng ký đặt lịch khám bệnh.',
    },
    {
      icon: <FileProtectOutlined />,
      label: 'Kết quả',
      desc: 'Tra cứu hồ sơ',
      value: 'Hướng dẫn tôi cách xem kết quả xét nghiệm online.',
    },
    {
      icon: <CreditCardOutlined />,
      label: 'Viện phí',
      desc: 'Thanh toán',
      value: 'Tôi muốn thanh toán chi phí khám bệnh.',
    },
    {
      icon: <HistoryOutlined />,
      label: 'Lịch sử',
      desc: 'Đơn thuốc cũ',
      value: 'Cho tôi xem lại lịch sử các lần khám trước.',
    },
  ];

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Xin chào! Tôi là Trợ lý Y tế Nexus. Tôi sẽ hỗ trợ bạn đặt lịch khám và tra cứu thông tin sức khỏe một cách nhanh chóng nhất.',
      sender: 'bot',
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (text = inputValue) => {
    if (!text.trim()) return;

    const timeString = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const userMsg = {
      id: Date.now(),
      text: text,
      sender: 'user',
      time: timeString,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const apiUrl = isAuthenticated ? '/chatbot/private' : '/chatbot';

      let response;
      if (isAuthenticated) {
        response = await axiosClient.post(apiUrl, { sessionId, message: text });
      } else {
        response = await httpPost(apiUrl, { sessionId, message: text }, false);
      }
      // response là data đã được unwrap bởi http.js
      const botReply =
        response?.message?.reply ||
        response?.reply ||
        'Xin lỗi, tôi chưa hiểu câu hỏi của bạn.';
      const botMsg = {
        id: Date.now() + 1,
        text: botReply,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        text: 'Hệ thống đang bận. Vui lòng thử lại sau.',
        sender: 'bot',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    setTimeout(() => setIsMaximized(false), 300);
  };

  const springConfig = { type: 'spring', stiffness: 260, damping: 20 };

  return (
    <div
      className={`fixed z-100 flex flex-col items-end font-sans ${
        isOpen && isMaximized
          ? 'inset-0'
          : 'bottom-4 right-4 md:bottom-6 md:right-6 gap-3 md:gap-4'
      }`}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={springConfig}
            className={`bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-200 ${
              isMaximized
                ? 'w-full h-full rounded-none'
                : 'w-[calc(100vw-2rem)] md:w-150 h-[80vh] md:h-[85vh] min-h-125 md:min-h-150 max-h-212.5 rounded-3xl md:rounded-4xl'
            }`}
          >
            {/* Header */}
            <div className="bg-linear-to-br from-[#0D9488] to-[#0F766E] px-4 md:px-6 py-4 md:py-5 shrink-0 relative overflow-hidden flex justify-center">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div
                className={`flex justify-between items-center relative z-10 w-full ${isMaximized ? 'max-w-5xl' : ''}`}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <Badge
                    dot
                    status="success"
                    offset={[-4, 32]}
                    className="m-0!"
                  >
                    <Avatar
                      size={46}
                      src={images.iconChatbot}
                      className="bg-white! p-1! border-2! border-white/30!"
                    />
                  </Badge>
                  <div className="flex flex-col">
                    <h3 className="text-white font-bold text-[16px] md:text-[18px] m-0 leading-tight">
                      Nexus Health AI
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Tag
                        color="cyan"
                        className="m-0! text-[10px]! font-bold! border-none! bg-white/20! text-white!"
                      >
                        BÁC SĨ TRỰC TUYẾN
                      </Tag>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    type="text"
                    icon={
                      isMaximized ? <CompressOutlined /> : <ExpandOutlined />
                    }
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="hidden! md:flex! text-white/80! hover:text-white! hover:bg-white/10! rounded-full! w-8! md:w-9! h-8! md:h-9! items-center! justify-center! border-none!"
                  />
                  <Button
                    type="text"
                    icon={<MinusOutlined />}
                    onClick={handleCloseChat}
                    className="text-white/80! hover:text-white! hover:bg-white/10! rounded-full! w-8! md:w-9! h-8! md:h-9! flex! items-center! justify-center! border-none!"
                  />
                </div>
              </div>
            </div>

            {/* Chat content */}
            <div className="flex-1 bg-[#F1F5F9] overflow-y-auto px-4 md:px-5 py-5 md:py-6 flex flex-col items-center [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div
                className={`w-full flex flex-col gap-6 ${isMaximized ? 'max-w-7xl' : ''}`}
              >
                {messages.length === 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                      <p className="text-slate-500 text-[12px] md:text-[13px] font-medium mb-3 md:mb-4 flex items-center gap-2">
                        <SafetyCertificateFilled className="text-emerald-500" />
                        Hệ thống tự động an toàn & bảo mật
                      </p>
                      <div
                        className={`grid gap-2 md:gap-3 ${isMaximized ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}
                      >
                        {medicalServices.map((service, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSendMessage(service.value)}
                            className="flex flex-col p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-all duration-300 transform-gpu hover:-translate-y-1 hover:shadow-md group overflow-hidden"
                          >
                            <div className="text-emerald-600 text-[20px] mb-1 md:mb-2 transition-colors">
                              {service.icon}
                            </div>
                            <span className="text-[12px] md:text-[13px] font-bold text-slate-800">
                              {service.label}
                            </span>
                            <span className="text-[10px] md:text-[11px] text-slate-400 leading-tight mt-1">
                              {service.desc}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 md:px-4 md:py-3 flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping mt-1.5 shrink-0"></div>
                      <p className="text-[11px] md:text-[12px] text-red-700 m-0 leading-relaxed">
                        <strong>Cấp cứu?</strong> Gọi <strong>1900-XXXX</strong>{' '}
                        nếu bạn đang nguy kịch.
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="flex flex-col gap-5">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex gap-2 md:gap-3 w-full ${isMaximized ? 'max-w-[70%]' : 'max-w-[90%]'} ${
                          msg.sender === 'user'
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        }`}
                      >
                        {msg.sender === 'bot' && (
                          <Avatar
                            size={28}
                            md:size={32}
                            src={images.iconChatbot}
                            className="bg-white! border! border-slate-200! shrink-0! mt-1!"
                          />
                        )}
                        <div
                          className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 min-w-0`}
                        >
                          <div
                            className={`px-3 py-2.5 md:px-4 md:py-3 text-[13.5px] md:text-[14.5px] leading-relaxed shadow-sm w-fit ${
                              msg.sender === 'user'
                                ? 'bg-[#0D9488] text-white rounded-[18px] rounded-tr-none'
                                : 'bg-white text-slate-700 border border-slate-200 rounded-[18px] rounded-tl-none'
                            }`}
                          >
                            {msg.sender === 'user' ? (
                              msg.text
                            ) : (
                              <div
                                className="bot-message"
                                dangerouslySetInnerHTML={{
                                  __html: formatMarkdownToHtml(msg.text),
                                }}
                              />
                            )}
                          </div>
                          <span className="text-[9px] md:text-[10px] text-slate-400 font-semibold uppercase px-1">
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start gap-2 md:gap-3">
                      <Avatar
                        size={28}
                        md:size={32}
                        src={images.iconChatbot}
                        className="bg-white! border! border-slate-200! shrink-0!"
                      />
                      <div className="bg-white border border-slate-200 rounded-[18px] px-3.5 py-2.5 flex gap-1 w-fit">
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            delay: 0.2,
                          }}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                        />
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            delay: 0.4,
                          }}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                        />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-1" />
                </div>
              </div>
            </div>

            {/* Input footer */}
            <div className="bg-white p-3 md:p-5 border-t border-slate-100 flex justify-center">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className={`flex flex-col gap-2 md:gap-3 w-full ${isMaximized ? 'max-w-4xl' : ''}`}
              >
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1 md:px-3 md:py-1.5 focus-within:border-emerald-400 focus-within:bg-white focus-within:shadow-md transition-all">
                  <Tooltip title="Đính kèm">
                    <Button
                      type="text"
                      icon={
                        <PaperClipOutlined className="text-base md:text-lg!" />
                      }
                      className="text-slate-400! hover:text-emerald-600! border-none! px-2!"
                    />
                  </Tooltip>
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Nhập yêu cầu..."
                    className="w-full! bg-transparent! border-none! shadow-none! focus:ring-0! text-[13.5px] md:text-[14.5px]! px-1!"
                  />
                  <Button
                    htmlType="submit"
                    type="primary"
                    disabled={!inputValue.trim()}
                    icon={<SendOutlined />}
                    className="rounded-[14px]! md:rounded-xl! h-8! w-8! md:h-10! md:w-10! flex! items-center! justify-center! bg-[#0D9488]! border-none! shrink-0!"
                  />
                </div>
                <div className="flex justify-center items-center gap-3 text-[10px] md:text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <HeartFilled className="text-red-400" /> Vì sức khỏe cộng
                    đồng
                  </span>
                  <span className="flex items-center gap-1">
                    <SafetyCertificateFilled className="text-emerald-500" /> Bảo
                    mật HIPAA
                  </span>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Badge
            count="Online"
            color="#10b981"
            offset={[-8, 48]}
            className="font-bold!"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 md:w-16! md:h-16! rounded-[20px]! md:rounded-[22px]! flex! items-center! justify-center! bg-white! shadow-[0_15px_35px_rgba(0,0,0,0.1)]! border-2! border-emerald-500! p-0!"
            >
              <Avatar
                size={40}
                md:size={48}
                src={images.iconChatbot}
                className="bg-transparent!"
              />
            </Button>
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

export default MedicalChatbot;
