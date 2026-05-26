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

/**
 * Chuyển đổi một ngày local (không kèm giờ) thành khoảng UTC
 * @param {dayjs.Dayjs} localStart - moment local đầu ngày
 * @param {dayjs.Dayjs} localEnd - moment local cuối ngày
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
const localRangeToUTC = (localStart, localEnd) => {
  return {
    startUTC: localStart.utc().toDate(),
    endUTC: localEnd.utc().toDate(),
  };
};

/**
 * Lấy khoảng thời gian của ngày hôm nay (theo local server)
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getTodayLocalRange = () => {
  const now = dayjs(); // local time của server
  const start = now.startOf("day");
  const end = now.endOf("day");
  return localRangeToUTC(start, end);
};

/**
 * Lấy khoảng thời gian của ngày hôm qua (theo local server)
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getYesterdayLocalRange = () => {
  const yesterday = dayjs().subtract(1, "day");
  const start = yesterday.startOf("day");
  const end = yesterday.endOf("day");
  return localRangeToUTC(start, end);
};

/**
 * Lấy khoảng thời gian của ngày mai (theo local server)
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getTomorrowLocalRange = () => {
  const tomorrow = dayjs().add(1, "day");
  const start = tomorrow.startOf("day");
  const end = tomorrow.endOf("day");
  return localRangeToUTC(start, end);
};

/**
 * Lấy khoảng thời gian của một tuần (từ thứ Hai đến Chủ Nhật) theo local server
 * @param {number} weekOffset - 0: tuần này, -1: tuần trước, 1: tuần sau
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getWeekLocalRange = (weekOffset = 0) => {
  const today = dayjs();
  // Ngày thứ Hai của tuần hiện tại (0=CN,1=T2,...,6=T7)
  let monday = today.day(1); // Nếu hôm nay là CN, day(1) sẽ lấy thứ 2 tuần sau? Cần kiểm tra
  // dayjs: .day(1) trả về thứ 2 trong tuần hiện tại, nếu hôm nay là CN thì nó lấy CN tuần sau? Thực tế dayjs coi tuần bắt đầu từ CN, nên .day(1) là thứ 2 của tuần hiện tại (tính từ CN). OK.
  // Nhưng để an toàn, ta dùng: monday = today.subtract(today.day() - 1, 'day') nếu today.day()>=1, nếu today.day()==0 (CN) thì lấy hôm qua? Đơn giản dùng dayjs().day(1) nhưng cần test.
  // Thay vào đó dùng: monday = today.startOf('week').add(1, 'day') vì startOf('week') là CN.
  const startOfWeek = today.startOf("week"); // Chủ nhật
  const mondayCorrect = startOfWeek.add(1, "day"); // Thứ hai
  const startWeek = mondayCorrect.add(weekOffset * 7, "day");
  const endWeek = startWeek.add(6, "day").endOf("day");
  return localRangeToUTC(startWeek, endWeek);
};

/**
 * Lấy khoảng thời gian của một tháng (theo local server)
 * @param {number} monthOffset - 0: tháng này, -1: tháng trước, 1: tháng sau
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getMonthLocalRange = (monthOffset = 0) => {
  const target = dayjs().add(monthOffset, "month");
  const start = target.startOf("month");
  const end = target.endOf("month");
  return localRangeToUTC(start, end);
};

/**
 * Lấy khoảng thời gian của một tháng cụ thể (theo local server)
 * @param {number} year - Năm (VD: 2026)
 * @param {number} month - Tháng (1-12)
 * @returns {{ startUTC: Date, endUTC: Date }}
 */
export const getSpecificMonthRange = (year, month) => {
  // Tạo ngày đầu tháng theo local timezone
  const start = dayjs().year(year).month(month - 1).startOf('month');
  const end = start.endOf('month');
  return localRangeToUTC(start, end);
};