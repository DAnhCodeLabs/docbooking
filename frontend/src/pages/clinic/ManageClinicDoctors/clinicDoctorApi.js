import { httpGet, httpPatch } from "@/services/http";


export const clinicDoctorApi = {
  // Lấy danh sách bác sĩ của phòng khám hiện tại
  getClinicDoctors: (params) => httpGet("/doctors/clinic", params, false), // không hiển thị toast

  // Lấy chi tiết bác sĩ (thuộc phòng khám)
  getClinicDoctorDetail: (id) => httpGet(`/doctors/clinic/${id}`, {}, false),

  // Xác nhận bác sĩ (chuyển sang pending_admin_approval)
  confirmDoctor: (id) => httpPatch(`/doctors/${id}/confirm`, {}),

  // Từ chối bác sĩ
  rejectDoctor: (id, reason) => httpPatch(`/doctors/${id}/reject`, { reason }),
};
