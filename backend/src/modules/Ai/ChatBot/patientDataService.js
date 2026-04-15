// services/patientDataService.js
// Chuyên lấy dữ liệu thô (raw data) cho bệnh nhân đã xác thực.
// Không format text, chỉ trả về object/array.
// Mọi truy vấn đều gắn userId để đảm bảo an toàn.

import Payment from '../../../models/Payment.js';
import MedicalConsultation from '../../../models/MedicalConsultation.js';
import Review from '../../../models/Review.js';
import * as appointmentService from '../../appointment/appointment.service.js';
import MedicalRecord from '../../../models/MedicalRecord.js';

/**
 * Ẩn số CCCD, chỉ hiển thị 3 ký tự cuối.
 * @param {string} cccd
 * @returns {string}
 */
const maskCccd = (cccd) => {
  if (!cccd || cccd.length < 4) return '***';
  return '***' + cccd.slice(-3);
};

/**
 * Làm sạch một medical record trước khi trả về.
 * - Loại bỏ trường cccd gốc, thêm cccdMasked.
 * - Giữ lại các trường cần thiết.
 * @param {Object} record - MedicalRecord document (plain object)
 * @returns {Object}
 */
const sanitizeMedicalRecord = (record) => {
  const {
    _id,
    fullName,
    phone,
    dateOfBirth,
    gender,
    insurance,
    bloodGroup,
    allergies,
    isDefault,
    createdAt,
    updatedAt,
  } = record;
  return {
    id: _id,
    fullName,
    phone,
    dateOfBirth,
    gender,
    cccdMasked: maskCccd(record.cccd),
    insurance: insurance
      ? {
          provider: insurance.provider,
          policyNumber: insurance.policyNumber,
          expiryDate: insurance.expiryDate,
        }
      : null,
    bloodGroup,
    allergies: allergies || [],
    isDefault: isDefault || false,
    createdAt,
    updatedAt,
  };
};

// ==================== 1. Lấy danh sách hồ sơ ====================
/**
 * Lấy tất cả hồ sơ bệnh nhân của user (chưa bị xóa mềm).
 * @param {string} userId
 * @returns {Promise<Array>} - Mảng các object đã được sanitize
 */
export const getMedicalRecords = async (userId) => {
  const records = await MedicalRecord.find({
    user: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();
  return records.map(sanitizeMedicalRecord);
};

// ==================== 2. Lấy danh sách cuộc hẹn (có filter) ====================
/**
 * Lấy danh sách cuộc hẹn của user với các bộ lọc.
 * Tái sử dụng appointmentService.getMyAppointments (đã có sẵn).
 * @param {string} userId
 * @param {Object} filters - { status, dateFrom, dateTo, search, page, limit, sort }
 * @returns {Promise<Object>} - { appointments, total, page, limit }
 */
export const getAppointments = async (userId, filters = {}) => {
  // appointmentService.getMyAppointments đã trả về cấu trúc { appointments, total, page, limit }
  // và đã populate slot, doctor, patientProfile.
  const result = await appointmentService.getMyAppointments(userId, filters);
  // Không cần sanitize thêm vì service đã chỉ trả thông tin an toàn (không có CCCD...)
  return result;
};

// ==================== 3. Lấy thông tin thanh toán ====================
/**
 * Lấy thông tin thanh toán theo appointmentId.
 * @param {string} appointmentId
 * @returns {Promise<Object|null>}
 */
export const getPaymentByAppointmentId = async (appointmentId) => {
  const payment = await Payment.findOne({ appointmentId }).lean();
  if (!payment) return null;
  // Chỉ lấy các trường cần thiết
  const {
    amount,
    status,
    refundStatus,
    refundAmount,
    transactionNo,
    bankCode,
    createdAt,
  } = payment;
  return {
    amount,
    status,
    refundStatus,
    refundAmount,
    transactionNo,
    bankCode,
    createdAt,
  };
};

// ==================== 4. Lấy kết quả khám ====================
/**
 * Lấy kết quả khám (consultation) theo appointmentId.
 * @param {string} appointmentId
 * @returns {Promise<Object|null>}
 */
export const getConsultationByAppointmentId = async (appointmentId) => {
  const consultation = await MedicalConsultation.findOne({
    appointmentId,
  }).lean();
  if (!consultation) return null;
  // Chỉ lấy các trường cần thiết
  const { diagnosis, instructions, followUpDate, prescription } = consultation;
  return {
    diagnosis,
    instructions,
    followUpDate,
    prescription: prescription || [],
  };
};

// ==================== 5. Lấy đánh giá (review) ====================
/**
 * Lấy đánh giá của bệnh nhân cho một appointment.
 * @param {string} appointmentId
 * @returns {Promise<Object|null>}
 */
export const getReviewByAppointmentId = async (appointmentId) => {
  const review = await Review.findOne({ appointmentId }).lean();
  if (!review) return null;
  const { rating, comment, createdAt } = review;
  return { rating, comment, createdAt };
};

// ==================== 6. Lấy cuộc hẹn gần nhất ====================
/**
 * Lấy cuộc hẹn gần nhất của user (có thể lọc theo tên bác sĩ).
 * @param {string} userId
 * @param {string|null} doctorName - Tùy chọn, tìm theo tên bác sĩ (tìm kiếm gần đúng)
 * @returns {Promise<Object|null>} - Appointment object hoặc null
 */
export const getLatestAppointment = async (userId, doctorName = null) => {
  const filters = {
    limit: 1,
    page: 1,
    sort: '-createdAt', // mới nhất trước
  };
  if (doctorName) {
    filters.search = doctorName; // service hỗ trợ search theo tên bác sĩ
  }
  const result = await appointmentService.getMyAppointments(userId, filters);
  return result.appointments.length > 0 ? result.appointments[0] : null;
};

// ==================== 7. Lấy cuộc hẹn theo ngày cụ thể ====================
/**
 * Lấy tất cả cuộc hẹn trong một ngày (UTC).
 * @param {string} userId
 * @param {Date} date - Đối tượng Date đã được chuẩn hóa về đầu ngày UTC (hoặc bất kỳ)
 * @returns {Promise<Array>} - Mảng các appointment
 */
export const getAppointmentsByDate = async (userId, date) => {
  // Tạo khoảng từ 00:00:00 đến 23:59:59.999 UTC của ngày đó
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  const filters = {
    dateFrom: start,
    dateTo: end,
    limit: 100, // một ngày không thể có quá 100 cuộc hẹn
    page: 1,
  };
  const result = await appointmentService.getMyAppointments(userId, filters);
  return result.appointments;
};

// ==================== 8. Lấy hồ sơ mặc định ====================
/**
 * Lấy hồ sơ mặc định của user (isDefault = true).
 * Nếu không có, lấy hồ sơ đầu tiên (mới nhất).
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export const getDefaultMedicalRecord = async (userId) => {
  const records = await getMedicalRecords(userId);
  if (records.length === 0) return null;
  const defaultRecord = records.find((r) => r.isDefault === true);
  return defaultRecord || records[0];
};
