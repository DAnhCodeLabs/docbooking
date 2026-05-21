// backend/src/modules/Ai/AdminChat/adminContextHandler.js

import {
  getDoctorCountByStatus,
  findSpecialtyByName,
  getDoctorsBySpecialty,
  findClinicByName,
  getDoctorsByClinic,
} from "./adminDataService.js";
import Specialty from "../../../models/Specialty.js";
import ClinicLead from "../../../models/ClinicLead.js"; // THÊM IMPORT

export const fetchAdminContext = async (parsed, inheritedStatus = null) => {
  console.log("[DEBUG][fetchAdminContext] parsed:", JSON.stringify(parsed));
  console.log("[DEBUG][fetchAdminContext] inheritedStatus:", inheritedStatus);

  const {
    intent,
    statusType,
    requiresClarification,
    clarificationMessage,
    specialtyName,
    clinicName,
    explicitStatus,
  } = parsed;

  if (requiresClarification) {
    console.log("[DEBUG][fetchAdminContext] requiresClarification -> return");
    return {
      intent,
      requiresClarification: true,
      clarificationMessage,
      data: null,
    };
  }

  const effectiveStatus = explicitStatus || inheritedStatus || "approved";
  console.log("[DEBUG][fetchAdminContext] effectiveStatus:", effectiveStatus);

  switch (intent) {
    case "list_doctors_by_specialty":
      console.log("[DEBUG][fetchAdminContext] Handling specialty");
      // ... (giữ nguyên code cũ)
      if (!specialtyName)
        return { intent, error: "MISSING_SPECIALTY_NAME", data: null };
      const specialty = await findSpecialtyByName(specialtyName);
      if (!specialty) {
        const suggestions = await Specialty.find({ status: "active" })
          .limit(5)
          .select("name")
          .lean();
        return {
          intent,
          error: "SPECIALTY_NOT_FOUND",
          querySpecialty: specialtyName,
          suggestions: suggestions.map((s) => s.name),
          data: null,
        };
      }
      const doctors = await getDoctorsBySpecialty(specialty._id);
      return {
        intent,
        specialty: { id: specialty._id, name: specialty.name },
        doctors,
        count: doctors.length,
        data: { specialtyName: specialty.name, doctors, count: doctors.length },
      };

    case "list_doctors_by_clinic":
      console.log(
        "[DEBUG][fetchAdminContext] Handling clinic, clinicName:",
        clinicName,
      );
      if (!clinicName) {
        console.log("[DEBUG][fetchAdminContext] Missing clinicName");
        return { intent, error: "MISSING_CLINIC_NAME", data: null };
      }

      const clinic = await findClinicByName(clinicName);
      console.log(
        "[DEBUG][fetchAdminContext] clinic found:",
        clinic ? clinic.clinicName : "null",
      );
      if (!clinic) {
        const suggestions = await ClinicLead.find({
          status: { $in: ["resolved", "contacted"] },
        })
          .limit(5)
          .select("clinicName")
          .lean();
        console.log(
          "[DEBUG][fetchAdminContext] suggestions:",
          suggestions.map((s) => s.clinicName),
        );
        return {
          intent,
          error: "CLINIC_NOT_FOUND",
          queryClinic: clinicName,
          suggestions: suggestions.map((c) => c.clinicName),
          data: null,
        };
      }

      const doctorsByClinic = await getDoctorsByClinic(
        clinic._id,
        effectiveStatus,
      );
      console.log(
        "[DEBUG][fetchAdminContext] doctorsByClinic count:",
        doctorsByClinic.length,
      );
      return {
        intent,
        clinic: {
          id: clinic._id,
          name: clinic.clinicName,
          address: clinic.address,
        },
        doctors: doctorsByClinic,
        count: doctorsByClinic.length,
        statusFilter: effectiveStatus,
        data: {
          clinicName: clinic.clinicName,
          doctors: doctorsByClinic,
          count: doctorsByClinic.length,
          statusFilter: effectiveStatus,
        },
      };

    case "count_doctors_by_approval_status":
      console.log(
        "[DEBUG][fetchAdminContext] Handling count, statusType:",
        statusType,
      );
      const isPending = statusType === "pending";
      const statuses = isPending
        ? ["pending", "pending_admin_approval"]
        : ["active"];
      const statusLabel = isPending ? "chưa duyệt" : "đã duyệt";
      try {
        const count = await getDoctorCountByStatus(statuses);
        return {
          intent,
          statusType,
          statusLabel,
          count,
          data: { count, statusLabel },
        };
      } catch {
        return { intent, error: "DB_QUERY_FAILED", data: null };
      }

    default:
      console.log("[DEBUG][fetchAdminContext] Unknown intent");
      return { intent: "unknown", data: null };
  }
};
