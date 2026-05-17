import ClinicLead from "../../../models/ClinicLead.js";
import {
  findClinicByName,
  findSpecialtyByName,
  clinicHasSpecialty,
  findDoctorByName,
  getDoctorResponseData,
  findDoctorsByClinic,
  findDoctorsByClinicAndSpecialty,
} from "./ClinicLookupService.js";

// ============================================================================
// 1. THUẬT TOÁN RIPPLE MATCHING
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
export const fetchIntentContext = async (parsed) => {
  let existenceResult = null;
  let specialtyCheckResult = null;
  let doctorInfo = null;
  let clinicInfo = null;
  let doctorsInClinic = null;
  let specialtyDoctorsList = null;

  switch (parsed.intent) {
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

      console.log("\n=== DEBUG: BƯỚC 1 - TỪ CHAT CONTEXT HANDLER ===");
      console.log(
        "1. Clinic (Parse):",
        parsed.clinicName,
        "| DB:",
        foundClinic?.clinicName || "NULL",
      );
      console.log(
        "2. Specialty (Parse):",
        parsed.specialtyName,
        "| DB:",
        foundSpecialty?.name || "NULL",
      );

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
      console.log("=================================================\n");
      break;
    }
  }

  return {
    existenceResult,
    specialtyCheckResult,
    doctorInfo,
    clinicInfo,
    doctorsInClinic,
    specialtyDoctorsList,
  };
};
