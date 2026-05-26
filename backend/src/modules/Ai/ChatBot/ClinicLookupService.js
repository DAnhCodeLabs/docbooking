import mongoose from "mongoose";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import User from "../../../models/User.js";
import { generateEmbedding } from "./AiService.js";

/**
 * UTILS: Chuẩn hóa & Xử lý chuỗi (Native Performance)
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

const expandAbbreviations = (str) => {
  if (!str) return "";
  return str
    .replace(/\bbv\b/g, "bệnh viện")
    .replace(/\bpk\b/g, "phòng khám")
    .replace(/\bbs\b/g, "bác sĩ")
    .replace(/\bkhoa\b/g, "chuyên khoa");
};

const wordMatchRatio = (normalizedName, queryWords) => {
  let matched = 0;
  for (const word of queryWords) {
    if (word.length >= 2 && normalizedName.includes(word)) matched++;
  }
  return queryWords.length ? matched / queryWords.length : 0;
};

const prepareSearchTokens = (queryName) => {
  const normalized = expandAbbreviations(normalizeVietnamese(queryName));
  return normalized.split(/\s+/).filter((w) => w.length >= 2);
};

// ============================================================================
// PUBLIC SERVICES
// ============================================================================

export const findClinicByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // 1. Exact match (case-insensitive)
  const exactClinic = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "resolved",
  }).lean();
  if (exactClinic) return exactClinic;

  // 2. Fuzzy Match (O(N) Single Pass - Memory Optimized)
  const queryWords = prepareSearchTokens(queryName);
  const allClinics = await ClinicLead.find({ status: "resolved" })
    .select("clinicName address clinicType status")
    .lean();

  let bestClinic = null;
  let highestScore = -1;

  for (const c of allClinics) {
    const normalizedName = expandAbbreviations(
      normalizeVietnamese(c.clinicName),
    );
    const ratio = wordMatchRatio(normalizedName, queryWords);

    if (ratio >= 0.6) {
      const lengthBonus = 1 - Math.min(1, normalizedName.length / 100);
      const score = ratio * 0.8 + lengthBonus * 0.2;
      if (score > highestScore) {
        highestScore = score;
        bestClinic = c;
      }
    }
  }

  return bestClinic;
};

export const getClinicBasicInfo = (clinic) => {
  if (!clinic) return null;
  return {
    name: clinic.clinicName,
    address: clinic.address,
    type: clinic.clinicType,
    status: clinic.status,
  };
};

export const findSpecialtyByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  // 1. Exact Match
  const exactSpecialty = await Specialty.findOne({
    name: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "active",
  }).lean();
  if (exactSpecialty) return exactSpecialty;

  // 2. Fuzzy Match (O(N) Single Pass)
  const queryWords = prepareSearchTokens(queryName);
  const allSpecialties = await Specialty.find({ status: "active" })
    .select("name description")
    .lean();

  let bestSpecialty = null;
  let highestRatio = -1;

  for (const s of allSpecialties) {
    const normalizedName = expandAbbreviations(normalizeVietnamese(s.name));
    const ratio = wordMatchRatio(normalizedName, queryWords);

    if (ratio >= 0.6 && ratio > highestRatio) {
      highestRatio = ratio;
      bestSpecialty = s;
    }
  }

  return bestSpecialty;
};

export const clinicHasSpecialty = async (clinicId, specialtyId) => {
  const clinic = await ClinicLead.findById(clinicId)
    .select("specialties")
    .lean();
  return clinic
    ? clinic.specialties.some((id) => id.toString() === specialtyId.toString())
    : false;
};

export const findDoctorByName = async (doctorName) => {
  if (!doctorName || doctorName.length < 2) return null;
  const populateOpts = {
    path: "doctorProfile",
    populate: [{ path: "clinicId" }, { path: "specialty" }],
  };

  // 1. Exact match
  let user = await User.findOne({
    fullName: { $regex: new RegExp(`^${doctorName}$`, "i") },
    role: "doctor",
    status: "active",
  }).populate(populateOpts);

  if (user?.doctorProfile) return { user, doctorProfile: user.doctorProfile };

  // 2. Text search
  const textSearchUsers = await User.find(
    { $text: { $search: doctorName }, role: "doctor", status: "active" },
    { score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(3)
    .populate(populateOpts);

  const validMatch = textSearchUsers.find((u) => u.doctorProfile);
  if (validMatch)
    return { user: validMatch, doctorProfile: validMatch.doctorProfile };

  // 3. Vector search (Atlas)
  try {
    const queryEmbedding = await generateEmbedding(`bác sĩ ${doctorName}`);
    if (!queryEmbedding || queryEmbedding.length !== 768) return null;

    const vectorResults = await DoctorProfile.aggregate([
      {
        $vectorSearch: {
          index: "doctor_embedding_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5,
          filter: { status: "active" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      { $match: { "userInfo.role": "doctor", "userInfo.status": "active" } },
      { $limit: 3 },
    ]);

    if (vectorResults.length) {
      await DoctorProfile.populate(vectorResults, [
        { path: "clinicId" },
        { path: "specialty" },
      ]);
      const normalizedInput = normalizeVietnamese(doctorName);

      for (const doc of vectorResults) {
        const normalizedName = normalizeVietnamese(doc.userInfo.fullName);
        if (
          normalizedName.includes(normalizedInput) ||
          normalizedInput.includes(normalizedName)
        ) {
          return { user: doc.userInfo, doctorProfile: doc };
        }
      }
      return {
        user: vectorResults[0].userInfo,
        doctorProfile: vectorResults[0],
      };
    }
  } catch (error) {
    console.error("[VectorSearch] Error:", error.message);
  }

  return null;
};

export const getDoctorResponseData = (doctorProfile, user) => {
  if (!doctorProfile || !user) return null;

  const clinic = doctorProfile.clinicId;
  const isResolvedClinic = clinic && clinic.status === "resolved";

  return {
    fullName: user.fullName,
    specialty: doctorProfile.specialty,
    experience: doctorProfile.experience,
    consultationFee: doctorProfile.consultationFee,
    bio: doctorProfile.bio,
    totalReviews: doctorProfile.totalReviews,
    sumRating: doctorProfile.sumRating,
    clinicName: isResolvedClinic
      ? clinic.clinicName
      : doctorProfile.customClinicName || null,
    clinicAddress: isResolvedClinic ? clinic.address || null : null,
    status: doctorProfile.status,
  };
};

export const findDoctorsByClinic = async (clinicId) => {
  const doctors = await DoctorProfile.find({ clinicId, status: "active" })
    .populate("user", "fullName")
    .populate("specialty", "name")
    .lean();

  return doctors.map((doc) => ({
    fullName: doc.user?.fullName || "Chưa rõ",
    specialty: doc.specialty?.name || null,
    doctorId: doc._id,
  }));
};

export const doctorBelongsToClinic = (doctorInfo, clinicName) => {
  if (!doctorInfo?.clinicName || !clinicName) return false;
  const normalizedInput = normalizeVietnamese(clinicName);
  const normalizedDoctorClinic = normalizeVietnamese(doctorInfo.clinicName);
  return (
    normalizedDoctorClinic.includes(normalizedInput) ||
    normalizedInput.includes(normalizedDoctorClinic)
  );
};

export const findDoctorsByClinicAndSpecialty = async (
  clinicId,
  specialtyId,
  sortByRating = false,
) => {
  if (!clinicId || !specialtyId) return [];

  // Triệt tiêu Query rác và N+1 Query bằng cách populate trực tiếp "specialty"
  const doctors = await DoctorProfile.find({
    clinicId,
    specialty: specialtyId,
    status: "active",
  })
    .populate({
      path: "user",
      match: { role: "doctor", status: "active" },
      select: "fullName",
    })
    .populate({ path: "specialty", select: "name" })
    .lean();

  const validDoctors = doctors
    .filter((doc) => doc.user)
    .map((doc) => ({
      ...doc,
      avgRating: doc.totalReviews ? doc.sumRating / doc.totalReviews : 0,
    }));

  validDoctors.sort((a, b) =>
    sortByRating ? b.avgRating - a.avgRating : b.totalReviews - a.totalReviews,
  );

  return validDoctors.slice(0, 5).map((doc) => ({
    fullName: doc.user.fullName,
    specialty: doc.specialty?._id || doc.specialty,
    specialtyName: doc.specialty?.name || null,
    experience: doc.experience,
    consultationFee: doc.consultationFee,
    totalReviews: doc.totalReviews,
    avgRating: doc.avgRating,
    bio: doc.bio,
    doctorId: doc._id,
  }));
};

/**
 * Lấy toàn bộ danh sách bác sĩ theo chuyên khoa (bất kể bệnh viện).
 * Tự động tính rating từ bảng Review, sắp xếp và giới hạn 10 kết quả tốt nhất.
 * @param {string} specialtyId
 * @returns {Promise<Object>} { totalCount, topDoctors }
 */
export const findDoctorsBySpecialtyOnly = async (specialtyId) => {
  if (!specialtyId) return { totalCount: 0, topDoctors: [] };

  // 1. Lấy danh sách hồ sơ bác sĩ
  const doctors = await mongoose.model("DoctorProfile").find({ specialty: specialtyId, status: "active" })
    .populate({ path: "user", match: { role: "doctor", status: "active" }, select: "fullName" })
    .populate({ path: "clinicId", select: "clinicName status" })
    .lean();

  const validDoctors = doctors.filter((doc) => doc.user);
  if (validDoctors.length === 0) return { totalCount: 0, topDoctors: [] };

  // 2. Trích xuất mảng user ID của các bác sĩ để truy vấn gộp
  const doctorUserIds = validDoctors.map(doc => doc.user._id);

  // 3. AGGREGATION: Tính tổng sao trực tiếp từ Collection Review (Chỉ 1 Query duy nhất)
  const reviewStats = await mongoose.model("Review").aggregate([
    { $match: { doctorId: { $in: doctorUserIds } } },
    {
      $group: {
        _id: "$doctorId",
        totalReviews: { $sum: 1 },
        sumRating: { $sum: "$rating" }
      }
    }
  ]);

  // 4. Tạo Map tra cứu nhanh O(1) trên RAM
  const statsMap = {};
  reviewStats.forEach(stat => {
    statsMap[stat._id.toString()] = {
      totalReviews: stat.totalReviews,
      avgRating: stat.totalReviews > 0 ? stat.sumRating / stat.totalReviews : 0
    };
  });

  // 5. Gắn điểm sao thực tế vào danh sách bác sĩ
  const enrichedDoctors = validDoctors.map((doc) => {
    const docUserIdStr = doc.user._id.toString();
    const realStats = statsMap[docUserIdStr] || { totalReviews: 0, avgRating: 0 };

    return {
      ...doc,
      totalReviews: realStats.totalReviews,
      avgRating: realStats.avgRating,
    };
  });

  // 6. Thuật toán: Sắp xếp theo Đánh giá trung bình -> Số lượt đánh giá
  enrichedDoctors.sort((a, b) => b.avgRating !== a.avgRating ? b.avgRating - a.avgRating : b.totalReviews - a.totalReviews);

  return {
    totalCount: enrichedDoctors.length,
    topDoctors: enrichedDoctors.slice(0, 10).map((doc) => ({
      fullName: doc.user.fullName,
      experience: doc.experience,
      consultationFee: doc.consultationFee,
      totalReviews: doc.totalReviews, // Số lượng đánh giá thực tế từ bảng Review
      avgRating: doc.avgRating,       // Sao trung bình thực tế từ bảng Review
      clinicName: (doc.clinicId && doc.clinicId.status === "resolved") ? doc.clinicId.clinicName : (doc.customClinicName || "Chưa cập nhật"),
      doctorId: doc._id,
    }))
  };
};