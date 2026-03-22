import { httpGet, httpPost } from "@/services/http";


export const bookingApi = {
  // Lấy chi tiết bác sĩ public
  getDoctorById: (id) => httpGet(`/doctors/${id}`, {}, false),

  // Lấy schedules và slots cho 1 bác sĩ trong 1 ngày
  getSlotsByDoctorAndDate: (doctorId, date) =>
    httpGet(
      "/schedules",
      {
        doctorId,
        startDate: date,
        endDate: date,
        includeSlots: true,
      },
      false,
    ),

  // Lấy danh sách hồ sơ bệnh án của user
  getMedicalRecords: () => httpGet("/medical-records", {}, false),

  // Tạo hồ sơ bệnh án mới
  createMedicalRecord: (data) => httpPost("/medical-records", data),

  // Tạo cuộc hẹn
  createAppointment: (data) => httpPost("/appointments", data),
};
