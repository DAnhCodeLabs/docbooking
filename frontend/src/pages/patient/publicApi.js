import { httpGet, httpPatch } from "@/services/http";

export const publicApi = {
  // Lấy danh sách bác sĩ (có phân trang, bộ lọc)
  getDoctors: (params) => httpGet("/doctors", params),

  // Lấy danh mục chuyên khoa (chỉ lấy các chuyên khoa đang active)
  getSpecialties: (params) => httpGet("/specialties", params),
  getClinics: (params) => httpGet("/clinic-leads/active", params),
  getDoctorById: (id, params = {}) => httpGet(`/doctors/${id}`, { params }),

  getMyAppointments: (params) => httpGet("/appointments/my", params, false),
  cancelAppointment: (id, reason) =>
    httpPatch(`/appointments/${id}/cancel`, { reason }, true),
  getDoctorReviews: (doctorId, params = {}) =>
    httpGet(`/reviews/doctors/${doctorId}`, params),
};
