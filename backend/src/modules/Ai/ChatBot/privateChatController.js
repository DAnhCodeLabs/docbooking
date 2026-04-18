// controllers/privateChatController.js
import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import ChatSession from '../../../models/ChatSession.js';
import AuditLog from '../../../models/AuditLog.js';
import * as patientDataService from './patientDataService.js';
import { parsePatientQuery } from './intentParser.js';
import sendSuccess from '../../../utils/response.js';
// Import lõi AI dùng chung từ chatController
import { handleGeneralAiQuery } from './chatController.js';

// ==================== CÁC HÀM FORMAT DỮ LIỆU (Helpers) ====================

const formatMedicalRecord = (record) => {
  let text = `🧑‍⚕️ *Hồ sơ:* ${record.fullName}\n`;
  if (record.dateOfBirth)
    text += `📅 *Ngày sinh:* ${dayjs(record.dateOfBirth).format('DD/MM/YYYY')}\n`;
  if (record.gender)
    text += `⚧ *Giới tính:* ${record.gender === 'male' ? 'Nam' : 'Nữ'}\n`;
  if (record.bloodGroup) text += `🩸 *Nhóm máu:* ${record.bloodGroup}\n`;
  if (record.allergies) text += `⚠️ *Dị ứng:* ${record.allergies}\n`;
  return text.trim();
};

const formatAppointmentList = (apps, total) => {
  if (total === 0) return 'Bạn hiện không có lịch hẹn nào.';
  let text = `📅 *Danh sách ${apps.length}/${total} lịch hẹn gần đây:*\n\n`;
  apps.forEach((ap, i) => {
    const time = dayjs(ap.slot.scheduleId.date).format('DD/MM/YYYY');
    text += `${i + 1}. *Ngày:* ${time} | *Giờ:* ${ap.slot.startTime}\n`;
    text += `   *Bác sĩ:* ${ap.doctor.fullName}\n`;
    text += `   *Trạng thái:* ${ap.status}\n\n`;
  });
  return text.trim();
};

const formatConsultation = (con) => {
  let text = `📝 *Kết quả khám ngày ${dayjs(con.createdAt).format('DD/MM/YYYY')}:*\n`;
  text += `👨‍⚕️ *Bác sĩ:* ${con.doctorId.fullName}\n`;
  text += `🔍 *Chẩn đoán:* ${con.diagnosis}\n`;
  if (con.prescription && con.prescription.length > 0) {
    text += `💊 *Đơn thuốc:* ${con.prescription.map((p) => p.drugName).join(', ')}\n`;
  }
  if (con.instructions) text += `💡 *Lời dặn:* ${con.instructions}\n`;
  return text.trim();
};

// ==================== CONTROLLER CHÍNH ====================

/**
 * Xử lý chat riêng tư cho người dùng đã đăng nhập.
 * Ưu tiên tra cứu dữ liệu cá nhân (DB), nếu không rõ ý định sẽ đẩy sang AI (Shared Core).
 */
export const processPrivateChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  const userId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  // 1. Phân tích ý định qua Regex (Không gọi AI)
  const intent = parsePatientQuery(message);
  const lowerMsg = message.toLowerCase();

  // 2. MÀNG LỌC THÔNG MINH (Bypass Filter)
  // Nếu câu hỏi chứa các từ khóa chung chung, ép buộc đẩy sang luồng AI
  const isGeneralQuery =
    /(bác sĩ nào|ai giỏi|bệnh viện|phòng khám|giá|chi phí|ở đâu|địa chỉ|chuyên khoa)/.test(
      lowerMsg
    );

  let replyText = '';
  let actionLogged = null;
  let processedByPrivateDB = false;

  // 3. LUỒNG TRA CỨU DỮ LIỆU CÁ NHÂN (PRIVATE DB)
  if (!isGeneralQuery && !intent.unrecognized && intent.type) {
    try {
      switch (intent.type) {
        case 'medicalRecord':
          const records = await patientDataService.getMedicalRecords(userId);
          replyText =
            records.length > 0
              ? records.map(formatMedicalRecord).join('\n\n')
              : 'Bạn chưa có hồ sơ y tế nào trên hệ thống.';
          actionLogged = 'VIEW_MEDICAL_RECORD';
          break;

        case 'appointment':
          const apps = await patientDataService.getAppointments(userId, {
            sort: '-createdAt',
            limit: 5,
          });
          replyText = formatAppointmentList(apps.appointments, apps.total);
          actionLogged = 'VIEW_APPOINTMENT_HISTORY';
          break;

        case 'consultation':
          const latestCon =
            await patientDataService.getLatestConsultation(userId);
          replyText = latestCon
            ? formatConsultation(latestCon)
            : 'Tôi không tìm thấy kết quả khám gần đây của bạn.';
          actionLogged = 'VIEW_CONSULTATION';
          break;

        case 'payment':
          const payments = await patientDataService.getPayments(userId, {
            limit: 3,
          });
          replyText =
            payments.length > 0
              ? `Bạn có ${payments.length} giao dịch gần đây. Trạng thái giao dịch mới nhất: ${payments[0].status}.`
              : 'Bạn chưa có giao dịch thanh toán nào.';
          actionLogged = 'VIEW_PAYMENT';
          break;

        default:
          // Nếu có type nhưng không khớp case nào, để AI xử lý ở dưới
          break;
      }

      if (replyText) {
        // Lưu hội thoại vào Session
        let session = await ChatSession.findOne({ sessionId });
        if (!session) {
          session = await ChatSession.create({ sessionId, user: userId });
        } else if (!session.user) {
          session.user = userId;
          await session.save();
        }

        session.messages.push({ role: 'user', content: [{ text: message }] });
        session.messages.push({
          role: 'assistant',
          content: [{ text: replyText }],
        });
        await session.save();

        // Ghi Audit Log
        if (actionLogged) {
          await AuditLog.create({
            userId,
            action: actionLogged,
            status: 'SUCCESS',
            ipAddress,
            userAgent,
            details: {
              intent: { type: intent.type, doctorName: intent.doctorName },
            },
          });
        }

        processedByPrivateDB = true;
        return sendSuccess(res, StatusCodes.OK, {
          sessionId: session.sessionId,
          reply: replyText,
          messageCount: session.messages.length,
        });
      }
    } catch (dbError) {
      // Graceful Fallback: Nếu lỗi DB, không báo lỗi 500 mà để mặc cho AI xử lý ở dưới
      console.error(
        '❌ Lỗi tra cứu Private DB, chuyển sang Fallback AI:',
        dbError
      );
    }
  }

  // 4. LUỒNG FALLBACK AI (SHARED CORE)
  // Xử lý nếu: Không phải hỏi dữ liệu cá nhân HOẶC luồng DB ở trên bị lỗi/không ra kết quả
  if (!processedByPrivateDB) {
    try {
      console.log('[DEBUG] Đang điều hướng câu hỏi sang Lõi AI dùng chung...');
      const aiResult = await handleGeneralAiQuery(sessionId, message, userId);

      // SỬA LỖI Ở ĐÂY: Dùng sendSuccess trả về cho AI Fallback
      return sendSuccess(res, StatusCodes.OK, aiResult);
    } catch (aiError) {
      console.error('❌ Lỗi Shared AI Fallback:', aiError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Dịch vụ tư vấn AI hiện đang bận, vui lòng thử lại sau.',
      });
    }
  }
});
