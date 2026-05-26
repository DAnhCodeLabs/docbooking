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
  findDoctorsBySpecialtyOnly,
} from "./ClinicLookupService.js";

import {
  getUserAppointments,
  getUserAppointmentsByDate,
  getUserAppointmentsByDoctor,
  getUserMedicalRecords,
  getUserPrescriptions,
} from "./PersonalDataService.js";

// ============================================================================
// 1. THUẬT TOÁN RIPPLE MATCHING
// ============================================================================
export const findHospitalsByContext = async (location) => {
  if (!location) return [];

  const searchKey = location
    .replace(/(phường|xã|quận|huyện|thành phố|tỉnh|tp|khối|xóm|\.)/gi, " ")
    .trim();
  const locParts = searchKey.split(/[\s,]+/).filter(Boolean);

  if (!locParts.length) return [];

  let currentParts = locParts.slice(-5);

  while (currentParts.length > 0) {
    const regexConditions = currentParts.map((part) => ({
      address: { $regex: part, $options: "i" },
    }));

    const clinics = await ClinicLead.find({
      status: "resolved",
      $and: regexConditions,
    })
      .limit(3)
      .lean();

    if (clinics.length > 0) return clinics;
    if (locParts.length > 1 && currentParts.length <= 2) break;

    currentParts.shift();
  }

  return [];
};

// ============================================================================
// 2. PHÂN LUỒNG TRUY VẤN DỮ LIỆU ĐỒNG THỜI (CONCURRENT I/O)
// ============================================================================
export const fetchIntentContext = async (
  parsed,
  lastMetadata,
  reqUser = null,
) => {
  const {
    intent,
    clinicName,
    specialtyName,
    doctorName,
    personalEntity,
    targetDate,
  } = parsed;

  // Tiền xử lý điều kiện (Tránh mã lặp lặp)
  const hasClinic = clinicName?.length >= 2;
  const hasSpecialty = specialtyName?.length >= 2;
  const hasDoctor = doctorName?.length >= 2;

  // Early Return cho bảo mật truy vấn cá nhân
  if (intent === "personal_query" && !reqUser?._id) {
    return { requiresLogin: true };
  }

  // Khởi tạo State mặc định
  const result = {
    existenceResult: null,
    specialtyCheckResult: null,
    doctorInfo: null,
    clinicInfo: null,
    doctorsInClinic: null,
    specialtyDoctorsList: null,
    bookingRequest: false,
    targetDoctorInfo: null,
    personalData: null,
  };

  switch (intent) {
    case "booking_request": {
      result.bookingRequest = true;
      let targetName = hasDoctor
        ? doctorName
        : lastMetadata?.match(/doctor=([^|]+)/)?.[1] || null;

      if (targetName) {
        const found = await findDoctorByName(targetName);
        if (found?.doctorProfile && found?.user) {
          result.targetDoctorInfo = getDoctorResponseData(
            found.doctorProfile,
            found.user,
          );
        }
      }
      break;
    }

    case "check_hospital_existence": {
      const clinic = hasClinic ? await findClinicByName(clinicName) : null;
      result.existenceResult = {
        found: !!clinic,
        clinic,
        queryName: clinicName || "không xác định",
      };
      break;
    }

    case "check_specialty_in_clinic": {
      if (hasClinic && hasSpecialty) {
        const [clinic, specialty] = await Promise.all([
          findClinicByName(clinicName),
          findSpecialtyByName(specialtyName),
        ]);

        if (clinic && specialty) {
          const hasSpec = await clinicHasSpecialty(clinic._id, specialty._id);
          let availableSpecialtiesNames = [];
          if (!hasSpec) {
            const clinicWithSpecs = await ClinicLead.findById(clinic._id)
              .populate("specialties", "name")
              .lean();
            availableSpecialtiesNames =
              clinicWithSpecs?.specialties?.map((s) => s.name) || [];
          }
          result.specialtyCheckResult = {
            found: true,
            clinic,
            specialty,
            hasSpecialty: hasSpec,
            queryClinicName: clinicName,
            querySpecialtyName: specialtyName,
            availableSpecialtiesNames,
          };
        } else {
          result.specialtyCheckResult = {
            found: false,
            errorType: !clinic ? "clinic_not_found" : "specialty_not_found",
            queryClinicName: clinicName,
            querySpecialtyName: specialtyName,
          };
        }
      } else {
        result.specialtyCheckResult = {
          found: false,
          errorType: "missing_entity",
          queryClinicName: clinicName,
          querySpecialtyName: specialtyName,
        };
      }
      break;
    }

    case "doctor_fee":
    case "doctor_info":
    case "doctor_specialty": {
      if (hasDoctor) {
        const found = await findDoctorByName(doctorName);
        if (found?.doctorProfile && found?.user) {
          result.doctorInfo = getDoctorResponseData(
            found.doctorProfile,
            found.user,
          );
          if (found.doctorProfile.specialty && !result.doctorInfo.specialty) {
            result.doctorInfo.specialty = found.doctorProfile.specialty;
          }
        }
      }
      break;
    }

    case "doctor_in_clinic":
    case "clinic_has_doctor": {
      if (hasDoctor) {
        const [foundDoctor, foundClinic] = await Promise.all([
          findDoctorByName(doctorName),
          hasClinic ? findClinicByName(clinicName) : null,
        ]);

        if (foundDoctor?.doctorProfile && foundDoctor?.user) {
          result.doctorInfo = getDoctorResponseData(
            foundDoctor.doctorProfile,
            foundDoctor.user,
          );
          if (
            foundDoctor.doctorProfile.specialty &&
            !result.doctorInfo.specialty
          ) {
            result.doctorInfo.specialty = foundDoctor.doctorProfile.specialty;
          }
        }
        if (foundClinic?.status === "resolved") {
          result.clinicInfo = foundClinic;
          if (intent === "clinic_has_doctor") {
            result.doctorsInClinic = await findDoctorsByClinic(foundClinic._id);
          }
        }
      }
      break;
    }

    case "find_doctors_by_clinic_specialty": {
      const [foundClinic, foundSpecialty] = await Promise.all([
        hasClinic ? findClinicByName(clinicName) : null,
        hasSpecialty ? findSpecialtyByName(specialtyName) : null,
      ]);

      if (hasSpecialty && foundClinic?.status === "resolved") {
        result.clinicInfo = {
          ...foundClinic,
          specialtyName: foundSpecialty?.name || specialtyName,
        };
        result.specialtyDoctorsList = foundSpecialty
          ? await findDoctorsByClinicAndSpecialty(
              foundClinic._id,
              foundSpecialty._id,
              parsed.preferGood === true,
            )
          : [];
      }
      break;
    }

    case "personal_query": {
      // Nhánh này đã được chặn `!reqUser` ở đầu hàm
      if (personalEntity === "appointments") {
        if (targetDate && hasDoctor) {
          const docFound = await findDoctorByName(doctorName);
          if (docFound?.user) {
            const apps = await getUserAppointmentsByDate(
              reqUser._id,
              targetDate,
              { limit: 10 },
            );
            result.personalData = {
              items: apps.filter(
                (app) => app.doctorId === docFound.user._id.toString(),
              ),
              filteredByDoctor: docFound.user.fullName,
              filteredByDate: targetDate,
            };
          } else {
            result.personalData = { error: "DOCTOR_NOT_FOUND", doctorName };
          }
        } else if (targetDate) {
          result.personalData = {
            items: await getUserAppointmentsByDate(reqUser._id, targetDate, {
              limit: 10,
            }),
            filteredByDate: targetDate,
          };
        } else if (hasDoctor) {
          const docFound = await findDoctorByName(doctorName);
          if (docFound?.user) {
            result.personalData = {
              items: await getUserAppointmentsByDoctor(
                reqUser._id,
                docFound.user._id,
                { limit: 10 },
              ),
              filteredByDoctor: docFound.user.fullName,
            };
          } else {
            result.personalData = { error: "DOCTOR_NOT_FOUND", doctorName };
          }
        } else {
          result.personalData = {
            items: await getUserAppointments(reqUser._id, { limit: 10 }),
          };
        }
        return { personalData: result.personalData, requiresLogin: false };
      } else if (personalEntity === "prescriptions") {
        const items = targetDate
          ? await getUserPrescriptions(reqUser._id, { targetDate })
          : await getUserPrescriptions(reqUser._id);
        return {
          personalData: { items },
          personalEntity: "prescriptions",
          requiresLogin: false,
        };
      } else if (personalEntity === "records") {
        const items = await getUserMedicalRecords(reqUser._id);
        return {
          personalData: { items },
          personalEntity: "records",
          requiresLogin: false,
        };
      } else {
        return {
          personalData: {
            error: "UNSUPPORTED_ENTITY",
            message: `Chức năng cho ${personalEntity} đang được phát triển.`,
          },
          requiresLogin: false,
        };
      }
    }

    case "find_doctors_by_specialty": {
      if (hasSpecialty) {
        const specialty = await findSpecialtyByName(specialtyName);
        if (specialty) {
          result.specialtyCheckResult = { found: true, specialty };
          result.specialtyDoctorsList = await findDoctorsBySpecialtyOnly(specialty._id);

          // Thêm log kiểm tra sau khi nhận từ Service
          console.log(`[DEBUG STEP 5 - HANDLER] Đã nhận list bác sĩ. Bác sĩ đầu tiên có totalReviews: ${result.specialtyDoctorsList.topDoctors[0]?.totalReviews}`);
        } else {
          result.specialtyCheckResult = { found: false, querySpecialtyName: specialtyName };
        }
      }
      break;
    }
  }

  return result;
};
