import { httpGet } from "@/services/http";


export const doctorApi = {
  // Lấy danh sách bệnh nhân đã khám của bác sĩ hiện tại
  getMyPatients: (params) => httpGet("/doctors/my-patients", params, false),

  // Lấy chi tiết các lần khám của một bệnh nhân (của bác sĩ này)
  getPatientAppointments: (patientId) =>
    httpGet(`/doctors/my-patients/${patientId}/appointments`, {}, false),
};
