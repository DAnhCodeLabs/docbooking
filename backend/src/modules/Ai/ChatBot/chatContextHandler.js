// ============================================================
// backend/src/modules/Ai/ChatBot/chatContextHandler.js
// ============================================================
import ClinicLead from "../../../models/ClinicLead.js";
import {
  clinicHasSpecialty,
  findClinicByName,
  findDoctorByName,
  findDoctorsByClinic,
  findDoctorsByClinicAndSpecialty,
  findSpecialtyByName,
  getDoctorResponseData,
} from "./ClinicLookupService.js";

import {
  getUserAppointments,
  getUserAppointmentsByDoctor,
  getUserAppointmentsByDate,
} from "./PersonalDataService.js";

// ============================================================================
// 1. THUẬT TOÁN RIPPLE MATCHING (giữ nguyên)
// ============================================================================
export const findHospitalsByContext = async (location) => {
  if (!location) return [];
  const searchKey = location
    .replace(/(phường|xã|quận|huyện|thành phố|tỉnh|tp|khối|xóm|\.)/gi, " ")
    .trim();
  const locParts = searchKey.split(/[\s,]+/).filter((p) => p.trim().length > 0);
  if (locParts.length === 0) return [];

  let currentParts = locParts.slice(-5);
  let clinics = [];

  while (currentParts.length > 0 && clinics.length === 0) {
    const regexConditions = currentParts.map((part) => ({
      address: { $regex: part, $options: "i" },
    }));
    clinics = await ClinicLead.find({
      status: "resolved",
      $and: regexConditions,
    })
      .limit(3)
      .lean();
    if (clinics.length === 0) {
      if (locParts.length > 1 && currentParts.length <= 2) break;
      currentParts.shift();
    }
  }
  return clinics;
};

// ============================================================================
// 2. PHÂN LUỒNG TRUY VẤN DỮ LIỆU ĐỒNG THỜI (CONCURRENT I/O)
// ============================================================================
export const fetchIntentContext = async (
  parsed,
  lastMetadata,
  reqUser = null,
) => {
  console.log(`[DEBUG fetchIntentContext] Intent: ${parsed.intent}`);
  console.log(
    `[DEBUG fetchIntentContext] parsed:`,
    JSON.stringify(parsed, null, 2),
  );

  let existenceResult = null;
  let specialtyCheckResult = null;
  let doctorInfo = null;
  let clinicInfo = null;
  let doctorsInClinic = null;
  let specialtyDoctorsList = null;
  let bookingRequest = false;
  let targetDoctorInfo = null;
  let personalData = null;

  switch (parsed.intent) {
    case "booking_request": {
      bookingRequest = true;
      if (parsed.doctorName && parsed.doctorName.length >= 2) {
        const found = await findDoctorByName(parsed.doctorName);
        if (found?.doctorProfile && found?.user) {
          targetDoctorInfo = getDoctorResponseData(
            found.doctorProfile,
            found.user,
          );
        }
      } else if (lastMetadata && lastMetadata.includes("doctor=")) {
        const doctorNameMatch = lastMetadata.match(/doctor=([^|]+)/);
        if (doctorNameMatch && doctorNameMatch[1]) {
          const found = await findDoctorByName(doctorNameMatch[1]);
          if (found?.doctorProfile && found?.user) {
            targetDoctorInfo = getDoctorResponseData(
              found.doctorProfile,
              found.user,
            );
          }
        }
      }
      break;
    }

    case "check_hospital_existence": {
      if (parsed.clinicName && parsed.clinicName.length >= 2) {
        const clinic = await findClinicByName(parsed.clinicName);
        existenceResult = {
          found: !!clinic,
          clinic: clinic || null,
          queryName: parsed.clinicName,
        };
      } else {
        existenceResult = {
          found: false,
          clinic: null,
          queryName: parsed.clinicName || "không xác định",
        };
      }
      break;
    }

    case "check_specialty_in_clinic": {
      if (
        parsed.clinicName &&
        parsed.specialtyName &&
        parsed.clinicName.length >= 2 &&
        parsed.specialtyName.length >= 2
      ) {
        const [clinic, specialty] = await Promise.all([
          findClinicByName(parsed.clinicName),
          findSpecialtyByName(parsed.specialtyName),
        ]);

        if (clinic && specialty) {
          const hasSpecialty = await clinicHasSpecialty(
            clinic._id,
            specialty._id,
          );
          let availableSpecialtiesNames = [];
          if (!hasSpecialty) {
            const clinicWithSpecs = await ClinicLead.findById(clinic._id)
              .populate("specialties", "name")
              .lean();
            availableSpecialtiesNames =
              clinicWithSpecs?.specialties?.map((s) => s.name) || [];
          }
          specialtyCheckResult = {
            found: true,
            clinic,
            specialty,
            hasSpecialty,
            queryClinicName: parsed.clinicName,
            querySpecialtyName: parsed.specialtyName,
            availableSpecialtiesNames,
          };
        } else {
          specialtyCheckResult = {
            found: false,
            errorType: !clinic ? "clinic_not_found" : "specialty_not_found",
            queryClinicName: parsed.clinicName,
            querySpecialtyName: parsed.specialtyName,
          };
        }
      } else {
        specialtyCheckResult = {
          found: false,
          errorType: "missing_entity",
          queryClinicName: parsed.clinicName,
          querySpecialtyName: parsed.specialtyName,
        };
      }
      break;
    }

    case "doctor_fee":
    case "doctor_info":
    case "doctor_specialty": {
      if (parsed.doctorName && parsed.doctorName.length >= 2) {
        const found = await findDoctorByName(parsed.doctorName);
        if (found?.doctorProfile && found?.user) {
          doctorInfo = getDoctorResponseData(found.doctorProfile, found.user);
          if (found.doctorProfile.specialty && !doctorInfo.specialty) {
            doctorInfo.specialty = found.doctorProfile.specialty;
          }
        }
      }
      break;
    }

    case "doctor_in_clinic":
    case "clinic_has_doctor": {
      if (parsed.doctorName && parsed.doctorName.length >= 2) {
        const [foundDoctor, foundClinic] = await Promise.all([
          findDoctorByName(parsed.doctorName),
          parsed.clinicName && parsed.clinicName.length >= 2
            ? findClinicByName(parsed.clinicName)
            : null,
        ]);

        if (foundDoctor?.doctorProfile && foundDoctor?.user) {
          doctorInfo = getDoctorResponseData(
            foundDoctor.doctorProfile,
            foundDoctor.user,
          );
          if (foundDoctor.doctorProfile.specialty && !doctorInfo.specialty)
            doctorInfo.specialty = foundDoctor.doctorProfile.specialty;
        }
        if (foundClinic && foundClinic.status === "resolved") {
          clinicInfo = foundClinic;
          if (parsed.intent === "clinic_has_doctor") {
            doctorsInClinic = await findDoctorsByClinic(foundClinic._id);
          }
        }
      }
      break;
    }

    case "find_doctors_by_clinic_specialty": {
      const [foundClinic, foundSpecialty] = await Promise.all([
        parsed.clinicName && parsed.clinicName.length >= 2
          ? findClinicByName(parsed.clinicName)
          : null,
        parsed.specialtyName && parsed.specialtyName.length >= 2
          ? findSpecialtyByName(parsed.specialtyName)
          : null,
      ]);

      if (
        parsed.specialtyName &&
        parsed.specialtyName.length >= 2 &&
        foundClinic &&
        foundClinic.status === "resolved"
      ) {
        clinicInfo = foundClinic;
        clinicInfo.specialtyName = foundSpecialty
          ? foundSpecialty.name
          : parsed.specialtyName;
        if (foundSpecialty) {
          specialtyDoctorsList = await findDoctorsByClinicAndSpecialty(
            foundClinic._id,
            foundSpecialty._id,
            parsed.preferGood === true,
          );
        } else {
          specialtyDoctorsList = [];
        }
      }
      break;
    }

    // ================== INTENT PERSONAL QUERY ==================
    case "personal_query": {
      console.log(`[DEBUG fetchIntentContext] personal_query triggered`);
      console.log(`[DEBUG] reqUser:`, reqUser ? reqUser._id : "null");
      console.log(`[DEBUG] parsed:`, parsed);

      if (!reqUser || !reqUser._id) {
        console.log(`[DEBUG] User not logged in, returning requiresLogin=true`);
        return { requiresLogin: true };
      }
      const { personalEntity, doctorName, targetDate } = parsed;
      console.log(
        `[DEBUG] personalEntity=${personalEntity}, doctorName=${doctorName}, targetDate=${targetDate}`,
      );

      if (personalEntity === "appointments") {
        let personalData = null;
        // Ưu tiên: lọc theo cả ngày và bác sĩ (nếu có)
        if (targetDate && doctorName && doctorName.length >= 2) {
          console.log(`[DEBUG] Case: both targetDate and doctorName`);
          const doctorFound = await findDoctorByName(doctorName);
          if (doctorFound && doctorFound.user && doctorFound.doctorProfile) {
            const doctorId = doctorFound.user._id;
            console.log(`[DEBUG] Found doctorId=${doctorId}`);
            let appointmentsByDate = await getUserAppointmentsByDate(
              reqUser._id,
              targetDate,
              { limit: 10 },
            );
            console.log(
              `[DEBUG] appointmentsByDate count: ${appointmentsByDate.length}`,
            );
            appointmentsByDate = appointmentsByDate.filter(
              (app) => app.doctorId === doctorId.toString(),
            );
            console.log(
              `[DEBUG] after doctor filter: ${appointmentsByDate.length}`,
            );
            personalData = {
              items: appointmentsByDate,
              filteredByDoctor: doctorFound.user.fullName,
              filteredByDate: targetDate,
            };
          } else {
            console.log(`[DEBUG] Doctor not found for name: ${doctorName}`);
            personalData = { error: "DOCTOR_NOT_FOUND", doctorName };
          }
        }
        // Chỉ lọc theo ngày
        else if (targetDate) {
          console.log(`[DEBUG] Case: only targetDate = ${targetDate}`);
          const items = await getUserAppointmentsByDate(
            reqUser._id,
            targetDate,
            { limit: 10 },
          );
          console.log(
            `[DEBUG] getUserAppointmentsByDate returned ${items.length} items`,
          );
          personalData = { items, filteredByDate: targetDate };
        }
        // Chỉ lọc theo bác sĩ
        else if (doctorName && doctorName.length >= 2) {
          console.log(`[DEBUG] Case: only doctorName = ${doctorName}`);
          const doctorFound = await findDoctorByName(doctorName);
          if (doctorFound && doctorFound.user && doctorFound.doctorProfile) {
            const doctorId = doctorFound.user._id;
            const items = await getUserAppointmentsByDoctor(
              reqUser._id,
              doctorId,
              { limit: 10 },
            );
            console.log(
              `[DEBUG] getUserAppointmentsByDoctor returned ${items.length} items`,
            );
            personalData = {
              items,
              filteredByDoctor: doctorFound.user.fullName,
            };
          } else {
            console.log(`[DEBUG] Doctor not found for name: ${doctorName}`);
            personalData = { error: "DOCTOR_NOT_FOUND", doctorName };
          }
        }
        // Không có bộ lọc: lấy tất cả
        else {
          console.log(`[DEBUG] Case: no filters, getting all appointments`);
          const items = await getUserAppointments(reqUser._id, { limit: 10 });
          console.log(
            `[DEBUG] getUserAppointments returned ${items.length} items`,
          );
          personalData = { items };
        }

        console.log(
          `[DEBUG] final personalData:`,
          JSON.stringify(personalData, null, 2),
        );
        return { personalData, requiresLogin: false };
      }

      // Các personalEntity khác (prescriptions, results, records, payments) có thể bổ sung sau
      console.log(`[DEBUG] Unsupported personalEntity: ${personalEntity}`);
      return {
        personalData: {
          error: "UNSUPPORTED_ENTITY",
          message: `Chức năng cho ${personalEntity} đang được phát triển.`,
        },
        requiresLogin: false,
      };
    }

    default:
      break;
  }

  const result = {
    existenceResult,
    specialtyCheckResult,
    doctorInfo,
    clinicInfo,
    doctorsInClinic,
    specialtyDoctorsList,
    bookingRequest,
    targetDoctorInfo,
    personalData,
  };
  return result;
};
