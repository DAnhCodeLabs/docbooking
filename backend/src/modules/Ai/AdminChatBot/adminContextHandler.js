// backend/src/modules/Ai/AdminChat/adminContextHandler.js

import {
  getDoctorCountByStatus,
  findSpecialtyByName,
  getDoctorsBySpecialty,
  findClinicByName,
  getDoctorsByClinic,
  getClinicsByStatus, // [NEW] cho list_clinics_by_approval_status
  getClinicDetails, // [NEW] cho get_clinic_details
} from "./adminDataService.js";
import Specialty from "../../../models/Specialty.js";
import ClinicLead from "../../../models/ClinicLead.js";

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
    statuses, // [NEW] cho list_clinics_by_approval_status
    statusLabel, // [NEW] cho list_clinics_by_approval_status
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
      const statusesArr = isPending
        ? ["pending", "pending_admin_approval"]
        : ["active"];
      const statusLabelText = isPending ? "chưa duyệt" : "đã duyệt";
      try {
        const count = await getDoctorCountByStatus(statusesArr);
        return {
          intent,
          statusType,
          statusLabel: statusLabelText,
          count,
          data: { count, statusLabel: statusLabelText },
        };
      } catch {
        return { intent, error: "DB_QUERY_FAILED", data: null };
      }

    // [NEW] case: danh sách bệnh viện theo trạng thái (đã duyệt/chưa duyệt)
    case "list_clinics_by_approval_status": {
      console.log(
        "[DEBUG][fetchAdminContext] Handling list_clinics_by_approval_status, statuses:",
        statuses,
      );
      if (!statuses || statuses.length === 0) {
        return {
          intent,
          error: "MISSING_STATUS",
          data: null,
        };
      }
      try {
        const clinics = await getClinicsByStatus(statuses);
        const count = clinics.length;
        return {
          intent,
          clinics: clinics.map((c) => ({ id: c._id, name: c.clinicName })),
          count,
          statusFilter: statuses,
          statusLabel: statusLabel, // "chưa duyệt", "đã duyệt", "bị từ chối"
          data: { clinics, count, statusLabel },
        };
      } catch (error) {
        console.error(
          "[fetchAdminContext] list_clinics_by_approval_status error:",
          error.message,
        );
        return {
          intent,
          error: "DB_QUERY_FAILED",
          data: null,
        };
      }
    }

    // [NEW] case: chi tiết một bệnh viện
    case "get_clinic_details": {
      console.log(
        "[DEBUG][fetchAdminContext] Handling get_clinic_details, clinicName:",
        parsed.clinicName,
      );
      const queryClinicName = parsed.clinicName;
      if (!queryClinicName || queryClinicName.length < 2) {
        return {
          intent,
          error: "MISSING_CLINIC_NAME",
          data: null,
        };
      }
      try {
        const clinic = await getClinicDetails(queryClinicName);
        if (!clinic) {
          // Lấy danh sách gợi ý (tất cả clinic, giới hạn 5)
          const suggestions = await ClinicLead.find({})
            .limit(5)
            .select("clinicName")
            .lean();
          return {
            intent,
            error: "CLINIC_NOT_FOUND",
            queryClinic: queryClinicName,
            suggestions: suggestions.map((c) => c.clinicName),
            data: null,
          };
        }
        return {
          intent,
          clinic: clinic,
          data: { clinic },
        };
      } catch (error) {
        console.error(
          "[fetchAdminContext] get_clinic_details error:",
          error.message,
        );
        return {
          intent,
          error: "DB_QUERY_FAILED",
          data: null,
        };
      }
    }

    default:
      console.log("[DEBUG][fetchAdminContext] Unknown intent");
      return { intent: "unknown", data: null };
  }
};
