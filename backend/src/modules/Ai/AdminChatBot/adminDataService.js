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
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D") // Xử lý chữ Đ đặc thù
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Bỏ ký tự đặc biệt
    .trim();
};

/**
 * Tìm kiếm chuyên khoa gần đúng (fuzzy) dựa trên tên
 */
export const findSpecialtyByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // 1. Exact match (sử dụng Collation hoặc Regex)
  const exactMatch = await Specialty.findOne({
    name: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "active",
  }).lean();
  if (exactMatch) return exactMatch;

  // 2. Fuzzy match
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
 * Lấy danh sách bác sĩ theo chuyên khoa
 */
export const getDoctorsBySpecialty = async (specialtyId) => {
  // Tối ưu: Giao việc Sort và Slice cho Database thay vì xử lý RAM ở server
  const doctors = await DoctorProfile.find({
    specialty: specialtyId,
    status: "active",
  })
    .populate({ path: "user", select: "fullName" }) // Chỉ lấy fullName
    .populate("clinicId", "clinicName address")
    .sort({ totalReviews: -1 })
    .lean();

  // Lọc user valid và giới hạn số lượng an toàn
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
 * Đếm số lượng bác sĩ theo trạng thái hồ sơ
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
 * Tìm kiếm clinic (bệnh viện/phòng khám) gần đúng dựa trên tên
 * Chỉ lấy các clinic đang hợp tác (status = 'resolved' hoặc 'contacted')
 */
export const findClinicByName = async (queryName) => {
  console.log("[DEBUG][findClinicByName] queryName:", queryName);
  if (!queryName || queryName.length < 2) return null;

  // Exact match
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

  // Fuzzy
  const normalizedQuery = normalizeVietnamese(queryName);
  const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length >= 2);
  if (!queryWords.length) return null;

  const allClinics = await ClinicLead.find({
    status: { $in: ["resolved", "contacted"] },
  })
    .select("clinicName address")
    .lean();
  console.log(
    "[DEBUG][findClinicByName] total clinics in DB:",
    allClinics.length,
  );

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

