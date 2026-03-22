import { httpGet, httpPatch, httpPost } from "@/services/http";


export const leaveApi = {
  // Lấy danh sách ngày nghỉ (có phân trang, bộ lọc)
  getLeaves: (params) => httpGet("/leaves", params),

  // Bác sĩ báo nghỉ mới
  createLeave: (payload) => httpPost("/leaves", payload, true),

  // Hủy ngày nghỉ (Mở lại lịch)
  cancelLeave: (id) => httpPatch(`/leaves/${id}/cancel`, {}, true),
};
