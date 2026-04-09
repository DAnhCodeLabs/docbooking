import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

/**
 * Parse chuỗi ngày từ frontend (YYYY-MM-DD) thành Date object UTC 00:00:00
 * @param {string} dateStr - Chuỗi định dạng YYYY-MM-DD
 * @returns {Date}
 */
export const parseDateToUTC = (dateStr) => {
  if (!dateStr) return null;
  return dayjs.utc(dateStr).startOf("day").toDate();
};

/**
 * Lấy thời điểm đầu ngày hiện tại theo UTC (00:00:00.000Z)
 * @returns {Date}
 */
export const getTodayUTC = () => {
  return dayjs.utc().startOf("day").toDate();
};

export const normalizeUTCDate = (date) => {
  return dayjs.utc(date).startOf("day").toDate();
};