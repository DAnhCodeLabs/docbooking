import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import ChatSession from '../../../models/ChatSession.js';
import AiService from './AiService.js';
import ClinicLead from '../../../models/ClinicLead.js';
import Specialty from '../../../models/Specialty.js';
import DoctorProfile from '../../../models/DoctorProfile.js';

// =====================================================================
// [LÕI DÙNG CHUNG] - HÀM XỬ LÝ CÁC CÂU HỎI PUBLIC/CHUNG CHUNG BẰNG AI
// =====================================================================
export const handleGeneralAiQuery = async (sessionId, message, userId = null) => {
  const lowerMsg = message.toLowerCase();

  // 1. GOM DỮ LIỆU NỀN (Master Data)
  // Lấy đồng thời (Concurrent) để tối ưu tốc độ phản hồi
  const [specialties, clinics] = await Promise.all([
    Specialty.find({ status: 'active' }).select('name').lean(),
    ClinicLead.find({ status: 'resolved' }).select('clinicName address').limit(10).lean()
  ]);

  // Chuẩn bị chuỗi text để đút vào Prompt cho AI
  const specialtyNames = specialties.map(s => s.name).join(', ');
  const clinicInfoText = clinics.length > 0 
    ? clinics.map(c => `+ Tên: ${c.clinicName} | Địa chỉ: ${c.address}`).join('\n') 
    : '';

  // Quét xem user có nhắc đến chuyên khoa hay phòng khám cụ thể nào không
  const matchedSpecialty = specialties.find(s => lowerMsg.includes(s.name.toLowerCase()));
  const matchedClinic = clinics.find(c => lowerMsg.includes(c.clinicName.toLowerCase()));

  // 2. KHỬ NHIỄU & LÀM SẠCH TÊN BÁC SĨ (Chống Greedy Regex)
  let cleanDoctorName = null;
  const nameMatch = message.match(/(?:bác sĩ|bs|doctor)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    // Các từ khóa nghi vấn thường nằm sau tên người
    const stopWords = ['nào', 'giỏi', 'tại', 'phòng', 'khám', 'là', 'giá', 'ở', 'đâu', 'chi', 'phí', 'tốt', 'không', 'vậy', 'bao', 'nhiêu'];
    const rawNameWords = nameMatch[1].trim().split(/\s+/);
    let filteredWords = [];
    
    for (let word of rawNameWords) {
      if (stopWords.includes(word.toLowerCase())) break;
      filteredWords.push(word);
    }
    
    if (filteredWords.length > 0) {
      cleanDoctorName = filteredWords.join(' ').trim();
    }
  }

  // 3. TRUY VẤN DATABASE BÁC SĨ (Tối ưu Pipeline)
  let doctorInfoContext = '';
  
  // Chỉ truy vấn DB Bác sĩ nếu nhận diện được tên, hoặc có nhắc đến chuyên khoa/cơ sở/từ khóa "bác sĩ"
  if (cleanDoctorName || matchedSpecialty || matchedClinic || lowerMsg.includes('bác sĩ')) {
    let matchCondition = { status: 'active' };
    
    // Ép điều kiện lọc theo chuyên khoa hoặc cơ sở nếu tìm thấy
    if (matchedSpecialty) matchCondition.specialty = matchedSpecialty._id;
    if (matchedClinic) matchCondition.clinicId = matchedClinic._id;

    const pipeline = [
      { $match: matchCondition },
      // MUST: Nối bảng users TRƯỚC KHI lọc tên
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' }
    ];

    // Chỉ lọc bằng Regex nếu thực sự bóc được tên người (độ dài > 1 để tránh lỗi)
    if (cleanDoctorName && cleanDoctorName.length > 1) {
      pipeline.push({ 
        $match: { 'userInfo.fullName': { $regex: cleanDoctorName, $options: 'i' } } 
      });
    }

    // Nối thêm các bảng liên quan để lấy text hiển thị
    pipeline.push(
      { $lookup: { from: 'specialties', localField: 'specialty', foreignField: '_id', as: 'specialtyInfo' } },
      { $unwind: { path: '$specialtyInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'clinicleads', localField: 'clinicId', foreignField: '_id', as: 'clinicInfo' } },
      { $unwind: { path: '$clinicInfo', preserveNullAndEmptyArrays: true } },
      { $limit: 5 } // Cung cấp tối đa 5 lựa chọn cho AI
    );

    const doctors = await DoctorProfile.aggregate(pipeline);

    // Format kết quả thành chuỗi cho AI đọc
    if (doctors.length > 0) {
      doctorInfoContext = '\n* [THÔNG TIN BÁC SĨ TÌM THẤY]:\n';
      doctors.forEach((d) => {
        const fee = d.consultationFee ? `${d.consultationFee.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật';
        const specName = d.specialtyInfo?.name || 'Đa khoa';
        const clinicName = d.clinicInfo?.clinicName || 'Tự do';
        doctorInfoContext += `   + Bác sĩ: ${d.userInfo.fullName} | Chuyên khoa: ${specName} | Cơ sở: ${clinicName} | 💰 Giá khám: ${fee}\n`;
      });
    }
  }

  // 4. XÂY DỰNG PROMPT THÔNG MINH
  const DYNAMIC_SYSTEM_PROMPT = `Bạn là chuyên viên y tế ảo của DOCGO.
QUY TẮC PHẢN HỒI:
1. Tuyệt đối không kê đơn thuốc. Nếu tình trạng khẩn cấp, khuyên gọi 115.
2. Chỉ tư vấn và giới thiệu dựa trên dữ liệu hệ thống bên dưới.
3. Trả lời đúng trọng tâm câu hỏi. Nếu hỏi giá khám, địa chỉ, hoặc chuyên môn, BẠN PHẢI lấy dữ liệu từ phần [THÔNG TIN BÁC SĨ TÌM THẤY].
4. Nếu dữ liệu trống, hãy xin lỗi lịch sự và nói rằng hệ thống chưa cập nhật thông tin đó.

[DỮ LIỆU HỆ THỐNG]:
* [CHUYÊN KHOA HỖ TRỢ]: ${specialtyNames || 'Đang cập nhật...'}
${clinicInfoText ? `* [CƠ SỞ ĐỐI TÁC]:\n${clinicInfoText}` : ''}
${doctorInfoContext}`;

  // 5. QUẢN LÝ SESSION (Ghép nối luồng Public và Private)
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = await ChatSession.create({ sessionId, user: userId });
  } else if (userId && !session.user) {
    // Tự động định danh nếu user vãng lai vừa đăng nhập
    session.user = userId; 
    await session.save();
  }

  session.messages.push({ role: 'user', content: [{ text: message }] });
  await session.save();

  // Lấy 10 tin nhắn gần nhất để làm ngữ cảnh (Sliding Window)
  const recentMessages = session.messages.slice(-10).map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content[0].text }],
  }));

  const payloadForPython = [
    { role: 'system', content: [{ text: DYNAMIC_SYSTEM_PROMPT }] },
    ...recentMessages,
  ];

  // 6. GỌI AI ENGINE & LƯU KẾT QUẢ
  const aiResponseText = await AiService.askPythonEngine(payloadForPython);
  
  session.messages.push({ role: 'assistant', content: [{ text: aiResponseText }] });
  await session.save();

  return {
    sessionId: session.sessionId,
    reply: aiResponseText,
    messageCount: session.messages.length
  };
};

// =====================================================================
// API: ENDPOINT DÀNH CHO PUBLIC (Khách vãng lai chưa đăng nhập)
// =====================================================================
export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error('Yêu cầu cung cấp sessionId và message.');
  }

  // Khách vãng lai gọi lõi AI chung, truyền userId = null
  const result = await handleGeneralAiQuery(sessionId, message, null);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});