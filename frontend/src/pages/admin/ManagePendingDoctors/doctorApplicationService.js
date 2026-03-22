import { httpGet, httpPatch } from "@/services/http";


export const doctorApplicationService = {
  // Lấy danh sách hồ sơ (có phân trang, search, status mặc định là pending)
  getApplications: (params) => httpGet("/admin/doctor-applications", params),

  // Lấy chi tiết hồ sơ
  getApplicationById: (id) =>
    httpGet(`/admin/doctor-applications/${id}`, {}, false),

  // Duyệt hoặc Từ chối hồ sơ
  processApplication: (id, data) =>
    httpPatch(`/admin/doctor-applications/${id}/process`, data),
};
