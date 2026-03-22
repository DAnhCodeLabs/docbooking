import dayjs from "dayjs";

/**
 * Format ngày theo định dạng DD/MM/YYYY
 * @param {string|Date|dayjs} date
 * @returns {string}
 */
export const formatDate = (date) => {
  return dayjs(date).format("DD/MM/YYYY");
};

/**
 * Format ngày giờ theo định dạng DD/MM/YYYY HH:mm
 * @param {string|Date|dayjs} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  return dayjs(date).format("DD/MM/YYYY HH:mm");
};

/**
 * Format theo định dạng ISO (dùng để gửi lên backend)
 * @param {string|Date|dayjs} date
 * @returns {string}
 */
export const toISOString = (date) => {
  return dayjs(date).toISOString();
};

/**
 * Hiển thị thời gian tương đối (ví dụ: 5 phút trước)
 * @param {string|Date|dayjs} date
 * @returns {string}
 */
export const timeAgo = (date) => {
  return dayjs(date).fromNow();
};

/**
 * Kiểm tra ngày hợp lệ
 * @param {string|Date|dayjs} date
 * @returns {boolean}
 */
export const isValidDate = (date) => {
  return dayjs(date).isValid();
};

/**
 * Chuyển đổi chuỗi từ backend (ISO) sang đối tượng dayjs
 * @param {string} isoString
 * @returns {dayjs.Dayjs}
 */
export const fromISO = (isoString) => {
  return dayjs(isoString);
};

// Thêm các hàm khác tùy nhu cầu
