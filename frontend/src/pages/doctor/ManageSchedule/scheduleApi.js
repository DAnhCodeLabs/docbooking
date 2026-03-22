import { httpGet, httpPatch, httpPost } from "@/services/http";


/**
 * Master Dev: Tập trung toàn bộ API của module Schedule vào đây
 * Không nhồi nhét http gọi thẳng trong Component
 */
export const scheduleApi = {
  // Lấy danh sách lịch làm việc (có phân trang, lọc ngày)
  getSchedules: (params) => httpGet("/schedules", params),

  // Bác sĩ tự tạo lịch làm việc mới
  createSchedule: (payload) => httpPost("/schedules", payload, true), // true = tự động bật Toast thành công

  // Lấy chi tiết các ca khám trong 1 ngày
  getScheduleSlots: (scheduleId) => httpGet(`/schedules/${scheduleId}/slots`),

  // Bác sĩ tự khóa/mở khóa 1 ca khám
  toggleSlotStatus: (slotId, action) =>
    httpPatch(`/schedules/slots/${slotId}/toggle`, { action }, true),
};
