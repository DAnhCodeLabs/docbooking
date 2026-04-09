import { httpGet, httpPatch } from "@/services/http";

export const appointmentApi = {
  getAppointments: (params) => httpGet("/appointments", params, false),
  getAppointmentById: (id) => httpGet(`/appointments/${id}`, {}, false),
  cancelAppointment: (id, reason) =>
    httpPatch(`/appointments/${id}/cancel`, { reason }, true),
  completeAppointment: (id, payload) =>
    httpPatch(`/appointments/${id}/complete`, payload, true),
};
