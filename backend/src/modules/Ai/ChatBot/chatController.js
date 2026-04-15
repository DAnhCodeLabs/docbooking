import ChatSession from '../../../models/ChatSession.js';
import AiService from './AiService.js';
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import ClinicLead from '../../../models/ClinicLead.js';
import Specialty from '../../../models/Specialty.js';
import DoctorProfile from '../../../models/DoctorProfile.js';
import User from '../../../models/User.js';

// --- HÀM HELPER: NHẬN DIỆN Ý ĐỊNH ---
const isAskingForLocation = (message) => {
  const keywords = [
    'ở đâu',
    'chỗ nào',
    'bệnh viện',
    'phòng khám',
    'địa chỉ',
    'cơ sở',
    'hà nội',
    'hồ chí minh',
    'hcm',
    'địa phương',
    'tỉnh',
    'thành phố',
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword));
};

const isAskingForPrice = (message) => {
  const keywords = [
    'giá',
    'chi phí',
    'bao nhiêu tiền',
    'giá khám',
    'phí khám',
    'tiền khám',
    'giá bao nhiêu',
    'mất bao nhiêu',
    'chi phí khám',
    'lệ phí',
    'thu phí',
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword));
};

const isAskingForDoctor = (message) => {
  const keywords = [
    'bác sĩ',
    'doctor',
    'bs',
    'chuyên khoa',
    'khám bởi',
    'tìm bác sĩ',
    'bác sĩ nào',
    'đánh giá bác sĩ',
    'kinh nghiệm',
    'bác sĩ giỏi',
    'bác sĩ tốt',
    'bác sĩ uy tín',
    'thông tin bác sĩ',
    'chữa bệnh',
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some((keyword) => lowerMessage.includes(keyword));
};

// --- HÀM LẤY DANH SÁCH BÁC SĨ (có lọc theo chuyên khoa hoặc phòng khám nếu có từ khóa) ---
const getDoctorsContext = async (message, limit = 5) => {
  // Trích xuất từ khóa chuyên khoa hoặc tên phòng khám từ message (đơn giản: tìm trong câu)
  const lowerMsg = message.toLowerCase();

  // Lấy tất cả chuyên khoa đang active để so khớp
  const allSpecialties = await Specialty.find({ status: 'active' })
    .select('name')
    .lean();
  const matchedSpecialty = allSpecialties.find((s) =>
    lowerMsg.includes(s.name.toLowerCase())
  );

  // Lấy tất cả clinic lead không bị lock/deleted
  const allClinics = await ClinicLead.find({
    status: { $nin: ['locked', 'deleted'] },
  })
    .select('clinicName')
    .lean();
  const matchedClinic = allClinics.find((c) =>
    lowerMsg.includes(c.clinicName.toLowerCase())
  );

  // Xây dựng điều kiện truy vấn
  let matchCondition = { status: 'active' };
  if (matchedSpecialty) {
    matchCondition.specialty = matchedSpecialty._id;
  }
  if (matchedClinic) {
    matchCondition.clinicId = matchedClinic._id;
  }

  let doctorNameMatch = null;
  const nameKeywords = message.match(/bác sĩ\s+([A-ZÀ-Ỹa-zà-ỹ\s]+)/i);
  if (nameKeywords && nameKeywords[1]) {
    doctorNameMatch = nameKeywords[1].trim();
    // Thêm điều kiện tìm kiếm gần đúng (dùng regex)
    matchCondition['userInfo.fullName'] = {
      $regex: doctorNameMatch,
      $options: 'i',
    };
  }

  // Aggregation lấy thông tin bác sĩ
  const doctors = await DoctorProfile.aggregate([
    { $match: matchCondition },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $lookup: {
        from: 'specialties',
        localField: 'specialty',
        foreignField: '_id',
        as: 'specialtyInfo',
      },
    },
    { $unwind: { path: '$specialtyInfo', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'clinicleads',
        localField: 'clinicId',
        foreignField: '_id',
        as: 'clinicInfo',
      },
    },
    { $unwind: { path: '$clinicInfo', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        avgRating: {
          $cond: [
            { $eq: ['$totalReviews', 0] },
            null,
            { $round: [{ $divide: ['$sumRating', '$totalReviews'] }, 1] },
          ],
        },
        feeFormatted: {
          $cond: [
            { $ifNull: ['$consultationFee', false] },
            { $concat: [{ $toString: '$consultationFee' }, ' VNĐ'] },
            'Chưa cập nhật',
          ],
        },
      },
    },
    { $sort: { avgRating: -1, totalReviews: -1 } }, // Bác sĩ rating cao lên đầu
    { $limit: limit },
  ]);

  if (doctors.length === 0) return '';

  // Format thông tin bác sĩ
  let doctorText = '\n* [DANH SÁCH BÁC SĨ TIÊU BIỂU]:\n';
  doctors.forEach((doc) => {
    const fullName = doc.userInfo.fullName || 'Chưa cập nhật';
    const specialtyName = doc.specialtyInfo?.name || 'Chưa cập nhật';
    const clinicName = doc.clinicInfo?.clinicName || 'Tự do';
    const rating = doc.avgRating
      ? `⭐ ${doc.avgRating}/5 (${doc.totalReviews} đánh giá)`
      : '⭐ Chưa có đánh giá';
    const experience = doc.experience
      ? `${doc.experience} năm kinh nghiệm`
      : '';
    const fee = doc.feeFormatted;
    doctorText += `   + Bác sĩ ${fullName} - Chuyên khoa: ${specialtyName}\n`;
    doctorText += `     Phòng khám: ${clinicName}\n`;
    doctorText += `     ${rating} ${experience}\n`;
    doctorText += `     💰 Giá khám: ${fee}\n`; // <-- Thêm dòng giá
    if (doc.bio) doctorText += `     Mô tả: ${doc.bio.substring(0, 100)}...\n`;
  });
  return doctorText;
};

// --- HÀM LẤY DANH SÁCH PHÒNG KHÁM (giữ nguyên logic cũ, chỉ cải tiến) ---
const getClinicsContext = async (message, limit = 5) => {
  const lowerMsg = message.toLowerCase();
  // Có thể lọc theo tỉnh thành nếu cần, nhưng hiện tại lấy chung
  const clinics = await ClinicLead.find({
    status: { $nin: ['locked', 'deleted'] },
  })
    .select('clinicName address')
    .limit(limit)
    .lean();

  if (clinics.length === 0) return '';
  let clinicText = '\n* [CƠ SỞ ĐỐI TÁC]:\n';
  clinics.forEach((c) => {
    clinicText += `   + Tên: ${c.clinicName} | Địa chỉ: ${c.address}\n`;
  });
  return clinicText;
};

// ==================== CONTROLLER CHÍNH ====================
export const processChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error('Yêu cầu cung cấp sessionId và message.');
  }

  // 1. Lấy danh sách chuyên khoa (luôn cần)
  const specialties = await Specialty.find({ status: 'active' })
    .select('name')
    .lean();
  const specialtyNames = specialties.map((s) => s.name).join(', ');

  // 2. Xác định ý định
  const askLocation = isAskingForLocation(message);
  const askDoctor = isAskingForDoctor(message);
  const askPrice = isAskingForPrice(message);

  let clinicInfo = '';
  let doctorInfo = '';
  let clinicPromptInstruction = '';
  let doctorPromptInstruction = '';
  let pricePromptInstruction = '';

  if (askPrice) {
    pricePromptInstruction = `
    - Người dùng đang hỏi về giá khám. BẠN PHẢI ưu tiên trả lời dựa trên thông tin "💰 Giá khám" trong danh sách bác sĩ hoặc phòng khám đã cung cấp.
    - Nếu người dùng hỏi giá của một bác sĩ cụ thể, hãy tìm tên bác sĩ đó trong danh sách và đọc giá.
    - Nếu không có thông tin giá cho bác sĩ/phòng khám mà người dùng hỏi, hãy nói "Thông tin giá chưa được cập nhật, vui lòng liên hệ trực tiếp phòng khám để biết chính xác."
  `;
  } else {
    pricePromptInstruction = '';
  }

  // 3. Lấy thông tin phòng khám nếu cần
  if (askLocation) {
    clinicInfo = await getClinicsContext(message);
    clinicPromptInstruction = `
      - Người dùng đang hỏi về địa điểm khám. BẠN PHẢI tư vấn các cơ sở y tế trong danh sách [CƠ SỞ ĐỐI TÁC] bên dưới.
      - Nếu người dùng hỏi một tỉnh thành không có trong danh sách, hãy báo là hệ thống chưa có đối tác ở khu vực đó.
    `;
  } else {
    clinicPromptInstruction = `
      - Người dùng chưa hỏi về địa điểm cụ thể. KHÔNG TỰ ĐỘNG liệt kê danh sách bệnh viện trừ khi được yêu cầu.
    `;
  }

  // 4. Lấy thông tin bác sĩ nếu cần
  if (askDoctor) {
    doctorInfo = await getDoctorsContext(message);
    if (doctorInfo) {
      doctorPromptInstruction = `
        - Người dùng đang hỏi về bác sĩ. BẠN PHẢI tư vấn dựa trên danh sách [DANH SÁCH BÁC SĨ TIÊU BIỂU] bên dưới.
        - Nêu rõ tên bác sĩ, chuyên khoa, phòng khám, đánh giá (nếu có).
        - Nếu người dùng hỏi bác sĩ theo chuyên khoa hoặc phòng khám, hãy ưu tiên giới thiệu bác sĩ phù hợp nhất.
      `;
    } else {
      doctorPromptInstruction = `
        - Người dùng hỏi về bác sĩ nhưng hiện tại hệ thống chưa có dữ liệu phù hợp. Hãy thông báo và gợi ý người dùng thử tìm kiếm với chuyên khoa hoặc phòng khám khác.
      `;
    }
  } else {
    doctorPromptInstruction = `
      - Người dùng chưa hỏi về bác sĩ. Chỉ trả lời về chuyên khoa hoặc địa điểm nếu được hỏi.
    `;
  }

  // 5. Xây dựng SYSTEM PROMPT ĐỘNG
  const DYNAMIC_SYSTEM_PROMPT = `Bạn là chuyên viên y tế ảo của DOCGO.

QUY TẮC PHẢN HỒI BẮT BUỘC:
1. Tuyệt đối không kê đơn thuốc. Nếu khẩn cấp, khuyên gọi 115.
2. Chỉ được khuyên khám các chuyên khoa có trong [CHUYÊN KHOA HỖ TRỢ].
${clinicPromptInstruction}
${doctorPromptInstruction}
${pricePromptInstruction}

[DỮ LIỆU HỆ THỐNG DOCGO]:
* [CHUYÊN KHOA HỖ TRỢ]: ${specialtyNames || 'Đang cập nhật...'}
${clinicInfo ? `* [CƠ SỞ ĐỐI TÁC]:\n${clinicInfo}` : ''}
${doctorInfo ? `* [DANH SÁCH BÁC SĨ TIÊU BIỂU]:\n${doctorInfo}` : ''}

LƯU Ý QUAN TRỌNG:
- Hãy trả lời một cách tự nhiên, thân thiện, chính xác.
- Nếu người dùng hỏi về bác sĩ, hãy ưu tiên giới thiệu bác sĩ từ danh sách trên.
- Nếu cần thêm thông tin (ví dụ hỏi tỉnh thành), hãy hỏi lại người dùng.
- Nếu hỏi về giá, hãy dùng thông tin "💰 Giá khám" trong danh sách.`;

  // 6. Quản lý session trong MongoDB
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = await ChatSession.create({ sessionId });
  }

  // Lưu tin nhắn User
  session.messages.push({ role: 'user', content: [{ text: message }] });
  await session.save();

  // 7. Chuẩn bị payload (sliding window 10 messages)
  const recentMessages = session.messages.slice(-10).map((msg) => ({
    role: msg.role,
    content: [{ text: msg.content[0].text }],
  }));

  const payloadForPython = [
    { role: 'system', content: [{ text: DYNAMIC_SYSTEM_PROMPT }] },
    ...recentMessages,
  ];

  // 8. Gọi Python AI Engine
  const aiResponseText = await AiService.askPythonEngine(payloadForPython);

  // 9. Lưu phản hồi AI vào DB
  session.messages.push({
    role: 'assistant',
    content: [{ text: aiResponseText }],
  });
  await session.save();

  // 10. Trả kết quả
  res.status(StatusCodes.OK).json({
    status: 'success',
    data: {
      sessionId: session.sessionId,
      reply: aiResponseText,
      messageCount: session.messages.length,
    },
  });
});
