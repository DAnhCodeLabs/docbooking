import { httpGet, httpPatch, httpDelete } from "@/services/http";

export const adminClinicLeadService = {
  // Lấy danh sách phòng khám
  getClinicLeads: (params) => httpGet("/clinic-leads", params),

  // Cập nhật trạng thái duyệt/từ chối
  updateStatus: (id, payload) =>
    httpPatch(`/clinic-leads/${id}/status`, payload),

  // Khóa phòng khám (yêu cầu lý do)
  lockClinic: (id, reason) =>
    httpPatch(`/clinic-leads/${id}/lock`, { reason }, true),

  // Mở khóa phòng khám
  unlockClinic: (id) => httpPatch(`/clinic-leads/${id}/unlock`, {}, true),

  // Xóa mềm phòng khám (có thể kèm lý do)
  softDeleteClinic: (id, reason) =>
    httpDelete(`/clinic-leads/${id}`, { data: { reason } }, true),
};
