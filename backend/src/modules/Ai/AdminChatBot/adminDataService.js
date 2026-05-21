// backend/src/modules/Ai/AdminChat/adminDataService.js

import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import ClinicLead from "../../../models/ClinicLead.js";

/**
 * Chuẩn hóa chuỗi tiếng Việt sử dụng chuẩn Unicode NFD
 */
const normalizeVietnamese = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
};

/**
 * Tìm kiếm chuyên khoa gần đúng (fuzzy) dựa trên tên – GIỮ NGUYÊN
 */
export const findSpecialtyByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  const exactMatch = await Specialty.findOne({
    name: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "active",
  }).lean();
  if (exactMatch) return exactMatch;

  const normalizedQuery = normalizeVietnamese(queryName);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  const allSpecialties = await Specialty.find({ status: "active" })
    .select("name")
    .lean();

  let bestMatch = null;
  let maxRatio = 0;

  for (const s of allSpecialties) {
    const normName = normalizeVietnamese(s.name);
    const matched = queryWords.reduce(
      (count, w) => count + (normName.includes(w) ? 1 : 0),
      0,
    );
    const ratio = matched / queryWords.length;

    if (ratio >= 0.6 && ratio > maxRatio) {
      maxRatio = ratio;
      bestMatch = s;
    }
  }

  return bestMatch;
};

/**
 * Lấy danh sách bác sĩ theo chuyên khoa – GIỮ NGUYÊN
 */
export const getDoctorsBySpecialty = async (specialtyId) => {
  const doctors = await DoctorProfile.find({
    specialty: specialtyId,
    status: "active",
  })
    .populate({ path: "user", select: "fullName" })
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .lean();

  return doctors
    .filter((doc) => doc.user?.fullName)
    .slice(0, 10)
    .map((doc) => ({
      id: doc._id,
      fullName: doc.user.fullName,
      experience: doc.experience,
      consultationFee: doc.consultationFee,
      totalReviews: doc.totalReviews,
      clinicName: doc.clinicId?.clinicName || null,
      clinicAddress: doc.clinicId?.address || null,
    }));
};

/**
 * Đếm số lượng bác sĩ theo trạng thái hồ sơ – GIỮ NGUYÊN
 */
export const getDoctorCountByStatus = async (statuses) => {
  try {
    return await DoctorProfile.countDocuments({ status: { $in: statuses } });
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi đếm bác sĩ (${statuses}):`,
      error.message,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

/**
 * Tìm kiếm clinic gần đúng (chỉ lấy clinic đang hợp tác: resolved/contacted) – GIỮ NGUYÊN
 * Dùng cho list_doctors_by_clinic
 */
export const findClinicByName = async (queryName) => {
  console.log("[DEBUG][findClinicByName] queryName:", queryName);
  if (!queryName || queryName.length < 2) return null;

  const exactMatch = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: { $in: ["resolved", "contacted"] },
  }).lean();
  if (exactMatch) {
    console.log(
      "[DEBUG][findClinicByName] exact match:",
      exactMatch.clinicName,
    );
    return exactMatch;
  }

  const normalizedQuery = normalizeVietnamese(queryName);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  const allClinics = await ClinicLead.find({
    status: { $in: ["resolved", "contacted"] },
  })
    .select("clinicName address")
    .lean();

  let bestMatch = null;
  let maxRatio = 0;
  for (const c of allClinics) {
    const normName = normalizeVietnamese(c.clinicName);
    const matched = queryWords.reduce(
      (count, w) => count + (normName.includes(w) ? 1 : 0),
      0,
    );
    const ratio = matched / queryWords.length;
    if (ratio >= 0.6 && ratio > maxRatio) {
      maxRatio = ratio;
      bestMatch = c;
    }
  }
  if (bestMatch)
    console.log(
      "[DEBUG][findClinicByName] fuzzy match:",
      bestMatch.clinicName,
      "ratio:",
      maxRatio,
    );
  else console.log("[DEBUG][findClinicByName] no fuzzy match");
  return bestMatch;
};

/**
 * Lấy danh sách bác sĩ theo clinic – GIỮ NGUYÊN
 */
export const getDoctorsByClinic = async (
  clinicId,
  approvalStatus = "approved",
) => {
  console.log(
    "[DEBUG][getDoctorsByClinic] clinicId:",
    clinicId,
    "approvalStatus:",
    approvalStatus,
  );
  let doctorStatuses = [];
  if (approvalStatus === "pending")
    doctorStatuses = ["pending", "pending_admin_approval"];
  else if (approvalStatus === "approved") doctorStatuses = ["active"];
  else return [];

  const doctors = await DoctorProfile.find({
    clinicId: clinicId,
    status: { $in: doctorStatuses },
  })
    .populate("user", "fullName")
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .limit(20)
    .lean();

  console.log(
    "[DEBUG][getDoctorsByClinic] found doctors count:",
    doctors.length,
  );
  return doctors
    .filter((doc) => doc.user?.fullName)
    .map((doc) => ({
      id: doc._id,
      fullName: doc.user.fullName,
      experience: doc.experience,
      consultationFee: doc.consultationFee,
      totalReviews: doc.totalReviews,
      clinicName: doc.clinicId?.clinicName || null,
      clinicAddress: doc.clinicId?.address || null,
    }));
};

// ==================== [NEW] HÀM MỚI ====================

/**
 * Lấy danh sách clinic theo mảng trạng thái (chỉ lấy _id và clinicName)
 * Dùng cho intent list_clinics_by_approval_status
 */
export const getClinicsByStatus = async (statuses) => {
  try {
    const clinics = await ClinicLead.find(
      { status: { $in: statuses } },
      { clinicName: 1, _id: 1 },
    ).lean();
    return clinics;
  } catch (error) {
    console.error(
      `[adminDataService] Lỗi lấy clinic theo status (${statuses}):`,
      error.message,
    );
    throw new Error("DB_QUERY_FAILED");
  }
};

/**
 * Lấy chi tiết một clinic (kể cả chưa duyệt) dựa trên tên (exact + fuzzy)
 * Dùng cho intent get_clinic_details
 * Không giới hạn status, admin muốn xem mọi clinic
 */
export const getClinicDetails = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // 1. Exact match (không phân biệt hoa thường, không lọc status)
  let clinic = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
  })
    .populate("specialties", "name")
    .lean();
  if (clinic) return clinic;

  // 2. Fuzzy match (normalize, tìm trong tất cả clinic)
  const normalizedQuery = normalizeVietnamese(queryName);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  const allClinics = await ClinicLead.find({})
    .select("clinicName") // chỉ lấy tên để so khớp, giảm tải
    .lean();

  let bestMatch = null;
  let maxRatio = 0;
  for (const c of allClinics) {
    const normName = normalizeVietnamese(c.clinicName);
    const matched = queryWords.reduce(
      (count, w) => count + (normName.includes(w) ? 1 : 0),
      0,
    );
    const ratio = matched / queryWords.length;
    if (ratio >= 0.6 && ratio > maxRatio) {
      maxRatio = ratio;
      bestMatch = c;
    }
  }

  if (bestMatch) {
    clinic = await ClinicLead.findById(bestMatch._id)
      .populate("specialties", "name")
      .lean();
    return clinic;
  }

  return null;
};
