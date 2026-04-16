// controllers/privateChatController.js
// Xử lý chat cho người dùng đã xác thực, hỗ trợ tra cứu thông tin cá nhân.

import asyncHandler from 'express-async-handler';
import { StatusCodes } from 'http-status-codes';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import ChatSession from '../../../models/ChatSession.js';
import AuditLog from '../../../models/AuditLog.js';
import * as patientDataService from './patientDataService.js';
import { parsePatientQuery } from './intentParser.js';
import sendSuccess from '../../../utils/response.js';
import AiService from './AiService.js';
import Specialty from '../../../models/Specialty.js';
import ClinicLead from '../../../models/ClinicLead.js';
import { getTodayUTC } from '../../../utils/date.js';

dayjs.extend(utc);

// ==================== CÁC HÀM FORMAT DỮ LIỆU ====================

/**
 * Format một medical record thành text.
 * @param {Object} record
 * @returns {string}
 */
const formatMedicalRecord = (record) => {
  let text = `🧑‍⚕️ *Hồ sơ:* ${record.fullName}\n`;
  if (record.dateOfBirth) {
    text += `📅 *Ngày sinh:* ${dayjs(record.dateOfBirth).format('DD/MM/YYYY')}\n`;
  }
  if (record.gender) {
    const genderMap = { male: 'Nam', female: 'Nữ', other: 'Khác' };
    text += `⚥ *Giới tính:* ${genderMap[record.gender] || record.gender}\n`;
  }
  if (record.phone) text += `📞 *Điện thoại:* ${record.phone}\n`;
  if (record.cccdMasked) text += `🆔 *CCCD:* ${record.cccdMasked}\n`;
  if (record.bloodGroup) text += `🩸 *Nhóm máu:* ${record.bloodGroup}\n`;
  if (record.allergies && record.allergies.length) {
    text += `🤧 *Dị ứng:* ${record.allergies.join(', ')}\n`;
  }
  if (record.insurance && record.insurance.policyNumber) {
    text += `💳 *Bảo hiểm:* ${record.insurance.provider || 'BHYT'} - số ${record.insurance.policyNumber}`;
    if (record.insurance.expiryDate) {
      text += ` (hết hạn: ${dayjs(record.insurance.expiryDate).format('DD/MM/YYYY')})`;
    }
    text += `\n`;
  }
  if (record.isDefault) text += `⭐ *Hồ sơ mặc định*\n`;
  return text.trim();
};

/**
 * Format danh sách cuộc hẹn thành text.
 * @param {Array} appointments
 * @param {number} total
 * @returns {string}
 */
const formatAppointmentList = (appointments, total) => {
  if (!appointments.length) return 'Không tìm thấy cuộc hẹn nào phù hợp.';

  let text = `📋 *Tìm thấy ${total} cuộc hẹn:*\n\n`;
  appointments.forEach((app, idx) => {
    const slotDate = app.slot?.scheduleId?.date;
    const startTime = app.slot?.startTime || '';
    const endTime = app.slot?.endTime || '';
    const doctorName = app.doctor?.fullName || 'Bác sĩ';
    const specialty = app.doctor?.specialty?.name || '';
    const clinicName = app.doctor?.clinicName || '';
    const statusMap = {
      pending_payment: '⏳ Chờ thanh toán',
      confirmed: '✅ Đã xác nhận',
      checked_in: '🏥 Đã check-in',
      completed: '✔️ Đã hoàn thành',
      cancelled: '❌ Đã hủy',
    };
    const statusText = statusMap[app.status] || app.status;

    let line = `${idx + 1}. *Ngày:* ${dayjs(slotDate).format('DD/MM/YYYY')} - *Giờ:* ${startTime} - ${endTime}\n`;
    line += `   *Bác sĩ:* ${doctorName}`;
    if (specialty) line += ` (${specialty})`;
    if (clinicName) line += ` - ${clinicName}`;
    line += `\n   *Trạng thái:* ${statusText}\n`;
    text += line + '\n';
  });
  return text;
};

/**
 * Format kết quả khám (consultation).
 * @param {Object} consultation
 * @param {Date|string} appointmentDate
 * @param {string} doctorName
 * @returns {string}
 */
const formatConsultation = (consultation, appointmentDate, doctorName) => {
  let text = `🩺 *Kết quả khám ngày ${dayjs(appointmentDate).format('DD/MM/YYYY')} với bác sĩ ${doctorName}:*\n\n`;
  text += `📝 *Chẩn đoán:* ${consultation.diagnosis}\n`;
  if (consultation.prescription && consultation.prescription.length) {
    text += `💊 *Đơn thuốc:*\n`;
    consultation.prescription.forEach((med, idx) => {
      text += `   ${idx + 1}. ${med.drugName} - ${med.dosage}`;
      if (med.instructions) text += ` (${med.instructions})`;
      if (med.duration) text += `, ${med.duration}`;
      text += `\n`;
    });
  }
  if (consultation.instructions) {
    text += `📋 *Hướng dẫn:* ${consultation.instructions}\n`;
  }
  if (consultation.followUpDate) {
    text += `📅 *Tái khám:* ${dayjs(consultation.followUpDate).format('DD/MM/YYYY')}\n`;
  }
  return text;
};

/**
 * Format thông tin thanh toán.
 * @param {Object} payment
 * @returns {string}
 */
const formatPayment = (payment) => {
  if (!payment) return 'Không có thông tin thanh toán cho lịch hẹn này.';

  const statusMap = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
  };
  const refundStatusMap = {
    none: 'Không hoàn',
    processing: 'Đang xử lý hoàn tiền',
    completed: 'Đã hoàn tiền',
    failed: 'Hoàn tiền thất bại',
  };

  let text = `💰 *Thông tin thanh toán:*\n`;
  text += `💵 Số tiền: ${payment.amount.toLocaleString('vi-VN')} VNĐ\n`;
  text += `✅ Trạng thái: ${statusMap[payment.status] || payment.status}\n`;
  if (payment.bankCode) text += `🏦 Ngân hàng: ${payment.bankCode}\n`;
  if (payment.transactionNo)
    text += `🔢 Mã giao dịch: ${payment.transactionNo}\n`;
  if (payment.refundAmount > 0) {
    text += `🔄 Hoàn tiền: ${payment.refundAmount.toLocaleString('vi-VN')} VNĐ (${refundStatusMap[payment.refundStatus] || payment.refundStatus})\n`;
  }
  if (payment.createdAt) {
    text += `📅 Ngày thanh toán: ${dayjs(payment.createdAt).format('DD/MM/YYYY HH:mm')}\n`;
  }
  return text;
};
// Helper: tìm appointment có consultation
const findAppointmentWithConsultation = async (userId, filters = {}) => {
  console.log('[DEBUG] findAppointmentWithConsultation - filters:', filters);
  const result = await patientDataService.getAppointments(userId, {
    ...filters,
    limit: 30,
    sort: '-createdAt',
  });
  console.log(
    `[DEBUG] Total appointments fetched: ${result.appointments.length}`
  );
  for (const app of result.appointments) {
    const appointmentId = app._id || app.id; // ưu tiên _id
    console.log(
      `[DEBUG] Checking appointment ${appointmentId} - status: ${app.status}, doctor: ${app.doctor?.fullName}`
    );
    if (!appointmentId) {
      console.log('[DEBUG] Skipping appointment without id');
      continue;
    }
    const cons =
      await patientDataService.getConsultationByAppointmentId(appointmentId);
    if (cons) {
      console.log('[DEBUG] Found consultation for appointment:', appointmentId);
      return app;
    }
  }
  console.log('[DEBUG] No consultation found among fetched appointments');
  return null;
};

// Helper: tìm appointment có payment
const findAppointmentWithPayment = async (userId, filters = {}) => {
  console.log('[DEBUG] findAppointmentWithPayment - filters:', filters);
  const result = await patientDataService.getAppointments(userId, {
    ...filters,
    limit: 30,
    sort: '-createdAt',
  });
  for (const app of result.appointments) {
    const appointmentId = app._id || app.id;
    if (!appointmentId) continue;
    const pay =
      await patientDataService.getPaymentByAppointmentId(appointmentId);
    if (pay) {
      console.log('[DEBUG] Found payment for appointment:', appointmentId);
      return app;
    }
  }
  return null;
};
// ==================== CONTROLLER CHÍNH ====================
export const processPrivateChat = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  const userId = req.user._id;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  console.log('\n=== [DEBUG] Private chat received ===');
  console.log('User ID:', userId.toString());
  console.log('Session ID:', sessionId);
  console.log('Message:', message);

  // 1. Phân tích ý định
  const intent = parsePatientQuery(message);
  console.log('[DEBUG] Parsed intent:', JSON.stringify(intent, null, 2));

  let replyText = '';
  let actionLogged = null;

  // 2. Xử lý theo intent
  if (!intent.unrecognized) {
    console.log('[DEBUG] Intent recognized, type:', intent.type);
    try {
      switch (intent.type) {
        case 'medicalRecord': {
          console.log('[DEBUG] Processing medicalRecord');
          const records = await patientDataService.getMedicalRecords(userId);
          console.log('[DEBUG] Found records count:', records.length);
          if (!records.length) {
            replyText =
              'Bạn chưa có hồ sơ bệnh nhân nào. Hãy tạo hồ sơ để đặt lịch khám.';
            break;
          }

          const lowerMsg = message.toLowerCase();
          // Hỏi nhóm máu
          if (lowerMsg.includes('nhóm máu')) {
            const bloodGroup = records[0]?.bloodGroup;
            if (bloodGroup) {
              replyText = `🩸 Nhóm máu của bạn là: ${bloodGroup}.`;
            } else {
              replyText = 'Bạn chưa cập nhật thông tin nhóm máu trong hồ sơ.';
            }
          }
          // Hỏi dị ứng
          else if (lowerMsg.includes('dị ứng')) {
            const allergies = records[0]?.allergies || [];
            if (allergies.length) {
              replyText = `🤧 Bạn dị ứng với: ${allergies.join(', ')}.`;
            } else {
              replyText = 'Bạn chưa có thông tin dị ứng nào trong hồ sơ.';
            }
          }
          // Hỏi hồ sơ người thân
          else if (lowerMsg.includes('người thân')) {
            const nonDefaultRecords = records.filter((r) => !r.isDefault);
            if (nonDefaultRecords.length) {
              replyText = nonDefaultRecords
                .map(formatMedicalRecord)
                .join('\n\n');
            } else {
              replyText =
                'Bạn chưa có hồ sơ của người thân nào. Hãy tạo thêm hồ sơ cho người thân trong tài khoản của bạn.';
            }
          }
          // Mặc định: hiển thị tất cả hồ sơ
          else {
            replyText = records.map(formatMedicalRecord).join('\n\n');
          }
          actionLogged = 'VIEW_MEDICAL_RECORD';
          break;
        }

        case 'appointment': {
          console.log('[DEBUG] Processing appointment');
          const lowerMsg = message.toLowerCase();
          let appointmentsData = null;

          // Đặt lịch mới (không hỗ trợ)
          if (
            lowerMsg.includes('đặt lịch') ||
            lowerMsg.includes('tạo lịch') ||
            lowerMsg.includes('đăng ký khám')
          ) {
            replyText =
              '📅 Để đặt lịch khám, vui lòng sử dụng chức năng "Đặt lịch" trên trang chủ hoặc liên hệ tổng đài.';
            actionLogged = null;
            break;
          }

          // Xây dựng filter cơ bản
          let filters = {};
          if (intent.status) filters.status = intent.status;
          // KHÔNG thêm search vào filters, sẽ lọc thủ công sau
          filters.limit = 20; // tăng limit để có dữ liệu lọc
          filters.sort = '-createdAt';

          // Xác định loại truy vấn
          if (lowerMsg.includes('sắp tới')) {
            const today = getTodayUTC();
            filters.dateFrom = today;
            filters.status = 'confirmed,pending_payment';
            filters.sort = 'date';
            appointmentsData = await patientDataService.getAppointments(
              userId,
              filters
            );
          } else if (intent.date) {
            const apps = await patientDataService.getAppointmentsByDate(
              userId,
              intent.date
            );
            appointmentsData = { appointments: apps, total: apps.length };
          } else if (intent.relativeTime === 'latest') {
            const app = await patientDataService.getLatestAppointment(userId);
            appointmentsData = {
              appointments: app ? [app] : [],
              total: app ? 1 : 0,
            };
          } else {
            appointmentsData = await patientDataService.getAppointments(
              userId,
              filters
            );
          }

          // Lọc theo tên bác sĩ nếu có (không phân biệt hoa thường, loại bỏ dấu)
          // Lọc theo tên bác sĩ nếu có
          let filteredApps = appointmentsData.appointments || [];
          if (intent.doctorName) {
            const searchName = intent.doctorName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            filteredApps = filteredApps.filter((app) => {
              const doctorFullName = app.doctor?.fullName || '';
              const normalizedDoctor = doctorFullName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
              return normalizedDoctor.includes(searchName);
            });
            console.log(
              `[DEBUG] Filtered by doctor name "${intent.doctorName}": ${filteredApps.length} appointments`
            );
          }

          // Lọc theo status nếu có
          if (intent.status) {
            filteredApps = filteredApps.filter(
              (app) => app.status === intent.status
            );
            console.log(
              `[DEBUG] Filtered by status "${intent.status}": ${filteredApps.length} appointments`
            );
          }

          if (filteredApps.length > 0) {
            replyText = formatAppointmentList(
              filteredApps,
              filteredApps.length
            );
          } else {
            replyText = 'Không tìm thấy cuộc hẹn nào với bác sĩ này.';
          }
          actionLogged = 'VIEW_APPOINTMENT_HISTORY';
          break;
        }

        case 'consultation': {
          console.log('[DEBUG] Processing consultation');
          let targetApp = null;

          if (intent.date) {
            const apps = await patientDataService.getAppointmentsByDate(
              userId,
              intent.date
            );
            for (const app of apps) {
              const cons =
                await patientDataService.getConsultationByAppointmentId(app.id);
              if (cons) {
                targetApp = app;
                break;
              }
            }
          } else {
            // Không có ngày cụ thể, tìm trong tất cả appointment (có lọc theo doctorName nếu có)
            targetApp = await findAppointmentWithConsultation(userId, {
              search: intent.doctorName,
            });
          }

          if (targetApp) {
            const consultation =
              await patientDataService.getConsultationByAppointmentId(
                targetApp.id
              );
            if (consultation) {
              const appointmentDate = targetApp.slot?.scheduleId?.date;
              const doctorName = targetApp.doctor?.fullName || 'Bác sĩ';
              replyText = formatConsultation(
                consultation,
                appointmentDate,
                doctorName
              );
            } else {
              replyText =
                'Lịch hẹn này chưa có kết quả khám. Vui lòng liên hệ bác sĩ để được cập nhật.';
            }
          } else {
            replyText =
              'Không tìm thấy kết quả khám nào. Bạn có thể thử hỏi theo ngày cụ thể hoặc tên bác sĩ.';
          }
          actionLogged = 'VIEW_CONSULTATION';
          break;
        }

        case 'payment': {
          console.log('[DEBUG] Processing payment');
          let targetApp = null;

          if (intent.date) {
            const apps = await patientDataService.getAppointmentsByDate(
              userId,
              intent.date
            );
            for (const app of apps) {
              const pay = await patientDataService.getPaymentByAppointmentId(
                app.id
              );
              if (pay) {
                targetApp = app;
                break;
              }
            }
          } else {
            targetApp = await findAppointmentWithPayment(userId, {
              search: intent.doctorName,
            });
          }

          if (targetApp) {
            const payment = await patientDataService.getPaymentByAppointmentId(
              targetApp.id
            );
            if (payment) {
              replyText = formatPayment(payment);
            } else {
              replyText =
                'Không tìm thấy thông tin thanh toán cho lịch hẹn này.';
            }
          } else {
            replyText = 'Không tìm thấy lịch hẹn nào có thông tin thanh toán.';
          }
          actionLogged = 'VIEW_PAYMENT';
          break;
        }
        default:
          console.log('[DEBUG] Unknown intent type:', intent.type);
          replyText = 'Tôi chưa hiểu yêu cầu của bạn. Vui lòng hỏi cụ thể hơn.';
          break;
      }
    } catch (error) {
      console.error('[DEBUG] Error processing intent:', error);
      replyText = 'Hệ thống đang bận, vui lòng thử lại sau.';
      actionLogged = null;
    }
  } else {
    // Fallback AI cho câu hỏi không nhận diện được
    console.log('[DEBUG] Unrecognized intent, fallback to AI');
    try {
      let session = await ChatSession.findOne({ sessionId });
      if (!session) {
        session = await ChatSession.create({ sessionId, user: userId });
      } else if (!session.user) {
        session.user = userId;
        await session.save();
      }

      session.messages.push({ role: 'user', content: [{ text: message }] });
      await session.save();

      const specialties = await Specialty.find({ status: 'active' })
        .select('name')
        .lean();
      const specialtyNames = specialties.map((s) => s.name).join(', ');
      const clinics = await ClinicLead.find({ status: 'resolved' })
        .select('clinicName address')
        .limit(5)
        .lean();
      const clinicInfo = clinics
        .map((c) => `+ Tên: ${c.clinicName} | Địa chỉ: ${c.address}`)
        .join('\n');

      const DYNAMIC_SYSTEM_PROMPT = `Bạn là chuyên viên y tế ảo của DOCGO.
QUY TẮC PHẢN HỒI BẮT BUỘC:
1. Tuyệt đối không kê đơn thuốc. Nếu khẩn cấp, khuyên gọi 115.
2. Chỉ được khuyên khám các chuyên khoa có trong [CHUYÊN KHOA HỖ TRỢ].
3. Nếu người dùng hỏi về địa điểm khám, hãy tư vấn dựa trên danh sách [CƠ SỞ ĐỐI TÁC] bên dưới.

[DỮ LIỆU HỆ THỐNG]:
* [CHUYÊN KHOA HỖ TRỢ]: ${specialtyNames || 'Đang cập nhật...'}
${clinicInfo ? `* [CƠ SỞ ĐỐI TÁC]:\n${clinicInfo}` : ''}`;

      const recentMessages = session.messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: [{ text: msg.content[0].text }],
      }));
      const payloadForPython = [
        { role: 'system', content: [{ text: DYNAMIC_SYSTEM_PROMPT }] },
        ...recentMessages,
      ];
      const aiResponseText = await AiService.askPythonEngine(payloadForPython);
      session.messages.push({
        role: 'assistant',
        content: [{ text: aiResponseText }],
      });
      await session.save();
      replyText = aiResponseText;
      actionLogged = null;
    } catch (error) {
      console.error('Fallback AI error:', error);
      replyText = 'Hệ thống AI đang bận, vui lòng thử lại sau.';
      actionLogged = null;
    }
  }

  // 3. Lưu session (nếu chưa lưu ở fallback)
  let session = await ChatSession.findOne({ sessionId });
  if (!session) {
    session = await ChatSession.create({ sessionId, user: userId });
  } else if (!session.user) {
    session.user = userId;
    await session.save();
  }

  // Thêm tin nhắn user và bot vào session (nếu chưa có trong fallback)
  const lastUserMsg = session.messages[session.messages.length - 2];
  const lastBotMsg = session.messages[session.messages.length - 1];
  if (!lastUserMsg || lastUserMsg.content[0].text !== message) {
    session.messages.push({ role: 'user', content: [{ text: message }] });
    session.messages.push({
      role: 'assistant',
      content: [{ text: replyText }],
    });
    await session.save();
  }

  // 4. Audit log
  if (actionLogged) {
    await AuditLog.create({
      userId,
      action: actionLogged,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      details: {
        intent: {
          type: intent.type,
          hasDate: !!intent.date,
          relativeTime: intent.relativeTime,
          doctorName: intent.doctorName,
          status: intent.status,
        },
      },
    });
  }

  // 5. Đảm bảo replyText không rỗng
  if (!replyText || replyText.trim() === '') {
    replyText =
      'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại với câu hỏi khác.';
  }

  console.log('[DEBUG] Final reply length:', replyText.length);
  console.log('[DEBUG] Action logged:', actionLogged);
  console.log('[DEBUG] Reply preview:', replyText.substring(0, 100));

  // 6. Trả về response
  sendSuccess(res, StatusCodes.OK, {
    sessionId: session.sessionId,
    reply: replyText,
    messageCount: session.messages.length,
  });
});
