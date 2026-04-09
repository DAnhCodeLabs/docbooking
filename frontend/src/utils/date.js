import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

/**
 * Format ngày theo định dạng DD/MM/YYYY (hiển thị)
 * Luôn dùng UTC để nhất quán với backend
 */
export const formatDate = (date) => {
  return dayjs.utc(date).format("DD/MM/YYYY");
};

/**
 * Format ngày giờ theo định dạng DD/MM/YYYY HH:mm (hiển thị)
 * Luôn dùng UTC để nhất quán với backend
 */
export const formatDateTime = (date) => {
  return dayjs.utc(date).format("DD/MM/YYYY HH:mm");
};

/**
 * Chuyển đổi sang YYYY-MM-DD để gửi backend (String)
 * LƯU Ý: Luôn dùng hàm này khi gửi dữ liệu lên backend
 */
export const formatDateForBackend = (date) => {
  return dayjs(date).format("YYYY-MM-DD");
};

/**
 * Kiểm tra ngày hợp lệ
 */
export const isValidDate = (date) => {
  return dayjs(date).isValid();
};

/**
 * Parse ngày từ backend (ISO) sang dayjs object
 */
export const fromISO = (isoString) => {
  return dayjs(isoString);
};

/**
 * So sánh 2 ngày (bỏ qua giờ phút) theo UTC
 */
export const isSameDay = (date1, date2) => {
  return dayjs
    .utc(date1)
    .startOf("day")
    .isSame(dayjs.utc(date2).startOf("day"), "day");
};

/**
 * Kiểm tra ngày có trong quá khứ không (theo UTC)
 */
export const isPastDay = (date) => {
  return dayjs.utc(date).startOf("day").isBefore(dayjs.utc().startOf("day"));
};

/**
 * Lấy ngày hiện tại ở UTC (00:00:00) - Trả về Date object
 * CONSISTENT với backend: cả hai trả về Date object
 */
export const getTodayUTC = () => {
  return dayjs.utc().startOf("day").toDate();
};

/**
 * Parse chuỗi YYYY-MM-DD thành Date object ở UTC
 * CONSISTENT với backend: cả hai trả về Date object
 */
export const parseDateToUTC = (dateStr) => {
  return dayjs.utc(dateStr).startOf("day").toDate();
};

export const formatDateUTC = (date, formatStr = "DD/MM/YYYY") => {
  if (!date) return "";
  return dayjs.utc(date).format(formatStr);
};