// utils/intentParser.js
// Module nhận diện ý định tra cứu dữ liệu bệnh nhân từ câu hỏi text.
// Chỉ dùng regex và từ khóa, không gọi AI. Trả về object chuẩn.

/**
 * Phân tích câu hỏi của người dùng.
 * @param {string} message - Câu hỏi dạng text.
 * @returns {Object} - { type, date, relativeTime, doctorName, status, recordId, unrecognized }
 */
export const parsePatientQuery = (message) => {
  const lowerMsg = message.toLowerCase();

  // Khởi tạo kết quả mặc định
  const result = {
    type: null,
    date: null,
    relativeTime: null,
    doctorName: null,
    status: null,
    recordId: null,
    unrecognized: false,
  };

  // 1. Xác định type
  result.type = detectType(lowerMsg);

  // 2. Trích xuất ngày cụ thể (ưu tiên hơn relativeTime)
  const extractedDate = extractDateFromString(message);
  if (extractedDate) {
    result.date = extractedDate;
  } else {
    result.relativeTime = extractRelativeTime(lowerMsg);
  }

  // 3. Tìm tên bác sĩ
  result.doctorName = extractDoctorName(message);

  // 4. Xác định trạng thái lịch hẹn
  result.status = extractStatus(lowerMsg);

  // 5. Nếu không có type và không có tham số nào hữu ích -> đánh dấu không nhận diện được
  if (!result.type && !result.date && !result.relativeTime && !result.doctorName && !result.status) {
    result.unrecognized = true;
  }

  return result;
};

// ==================== Các hàm phụ trợ ====================

/**
 * Xác định loại dữ liệu cần tra cứu.
 * @param {string} lowerMsg
 * @returns {string|null}
 */
const detectType = (lowerMsg) => {
  // Ưu tiên consultation (kết quả khám, đơn thuốc)
  if (/kết quả khám|chẩn đoán|đơn thuốc|toa thuốc|hướng dẫn|tái khám/.test(lowerMsg)) {
    return 'consultation';
  }
  // appointment (lịch hẹn, lịch sử khám)
  if (/lịch hẹn|cuộc hẹn|lịch khám|lịch sử khám|khám bệnh|đặt lịch|lịch hẹn sắp tới/.test(lowerMsg)) {
    return 'appointment';
  }
  // medicalRecord (hồ sơ, bảo hiểm, nhóm máu, dị ứng, CCCD)
  if (/hồ sơ|bảo hiểm|nhóm máu|dị ứng|cccd|thông tin cá nhân|thẻ bảo hiểm/.test(lowerMsg)) {
    return 'medicalRecord';
  }
  // payment (thanh toán, tiền nợ, hoàn tiền)
  if (/thanh toán|tiền|nợ|hoàn tiền|đã trả|chưa trả|chi phí/.test(lowerMsg)) {
    return 'payment';
  }
  return null;
};

/**
 * Trích xuất ngày tháng cụ thể từ câu hỏi.
 * Hỗ trợ định dạng: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, dd tháng mm năm yyyy
 * @param {string} message
 * @returns {Date|null} - Ngày ở UTC 00:00:00 hoặc null
 */
const extractDateFromString = (message) => {
  // Pattern 1: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  let match = message.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS tháng từ 0
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }
  // Pattern 2: dd tháng mm năm yyyy (tiếng Việt)
  match = message.match(/(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day));
  }
  return null;
};

/**
 * Trích xuất thời gian tương đối (gần nhất, hôm qua, tuần trước...)
 * @param {string} lowerMsg
 * @returns {string|null}
 */
const extractRelativeTime = (lowerMsg) => {
  if (/gần nhất|mới nhất|cuối cùng/.test(lowerMsg)) return 'latest';
  if (/hôm qua/.test(lowerMsg)) return 'yesterday';
  if (/hôm nay/.test(lowerMsg)) return 'today';
  if (/tuần trước/.test(lowerMsg)) return 'last_week';
  if (/tuần này/.test(lowerMsg)) return 'this_week';
  if (/tháng trước/.test(lowerMsg)) return 'last_month';
  return null;
};

/**
 * Trích xuất tên bác sĩ (nếu có).
 * @param {string} message
 * @returns {string|null}
 */
const extractDoctorName = (message) => {
  const regex = /(bác sĩ|bs|doctor)\s+([A-ZÀ-Ỹa-zà-ỹ\s]+)/i;
  const match = message.match(regex);
  if (match && match[2]) {
    return match[2].trim();
  }
  return null;
};

/**
 * Xác định trạng thái lịch hẹn.
 * @param {string} lowerMsg
 * @returns {string|null}
 */
const extractStatus = (lowerMsg) => {
  if (/đã hoàn thành|completed/.test(lowerMsg)) return 'completed';
  if (/đã hủy|cancelled/.test(lowerMsg)) return 'cancelled';
  if (/chờ thanh toán|pending/.test(lowerMsg)) return 'pending_payment';
  if (/đã xác nhận|confirmed/.test(lowerMsg)) return 'confirmed';
  return null;
};