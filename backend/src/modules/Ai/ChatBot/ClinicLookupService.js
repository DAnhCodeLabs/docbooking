import mongoose from "mongoose";
import ClinicLead from "../../../models/ClinicLead.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import Specialty from "../../../models/Specialty.js";
import User from "../../../models/User.js";
import { generateEmbedding } from "./AiService.js";

/**
 * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu, lowercase, xóa ký tự đặc biệt)
 * @param {string} str
 * @returns {string}
 */
const normalizeVietnamese = (str) => {
  if (!str) return "";
  const map = {
    á: "a",
    à: "a",
    ả: "a",
    ã: "a",
    ạ: "a",
    ă: "a",
    ắ: "a",
    ằ: "a",
    ẳ: "a",
    ẵ: "a",
    ặ: "a",
    â: "a",
    ấ: "a",
    ầ: "a",
    ẩ: "a",
    ẫ: "a",
    ậ: "a",
    đ: "d",
    é: "e",
    è: "e",
    ẻ: "e",
    ẽ: "e",
    ẹ: "e",
    ê: "e",
    ế: "e",
    ề: "e",
    ể: "e",
    ễ: "e",
    ệ: "e",
    í: "i",
    ì: "i",
    ỉ: "i",
    ĩ: "i",
    ị: "i",
    ó: "o",
    ò: "o",
    ỏ: "o",
    õ: "o",
    ọ: "o",
    ô: "o",
    ố: "o",
    ồ: "o",
    ổ: "o",
    ỗ: "o",
    ộ: "o",
    ơ: "o",
    ớ: "o",
    ờ: "o",
    ở: "o",
    ỡ: "o",
    ợ: "o",
    ú: "u",
    ù: "u",
    ủ: "u",
    ũ: "u",
    ụ: "u",
    ư: "u",
    ứ: "u",
    ừ: "u",
    ử: "u",
    ữ: "u",
    ự: "u",
    ý: "y",
    ỳ: "y",
    ỷ: "y",
    ỹ: "y",
    ỵ: "y",
  };
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, (c) => map[c] || "");
};

/**
 * Tìm kiếm clinic theo tên (ưu tiên chính xác, sau đó fuzzy)
 * @param {string} queryName - Tên bệnh viện người dùng nhập
 * @returns {Promise<Object|null>} - Clinic object hoặc null
 */
export const findClinicByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  const normalizedQuery = normalizeVietnamese(queryName);

  // Bước 1: Tìm chính xác (case-insensitive) trên tên gốc
  let clinic = await ClinicLead.findOne({
    clinicName: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "resolved",
  }).lean();

  if (clinic) return clinic;

  // Bước 2: Tìm gần đúng bằng regex bao hàm toàn bộ từ khóa
  const fuzzyRegex = normalizedQuery
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .map((word) => `(?=.*${word})`)
    .join("");
  if (fuzzyRegex) {
    const allClinics = await ClinicLead.find({ status: "resolved" })
      .select("clinicName address clinicType status")
      .lean();
    const matched = allClinics.filter((c) => {
      const normalizedName = normalizeVietnamese(c.clinicName);
      const queryWords = normalizedQuery.split(/\s+/);
      return queryWords.every((word) => normalizedName.includes(word));
    });
    if (matched.length) {
      matched.sort((a, b) => a.clinicName.length - b.clinicName.length);
      return matched[0];
    }
  }

  return null;
};

/**
 * Lấy thông tin cơ bản của clinic để hiển thị
 * @param {Object} clinic
 * @returns {Object}
 */
export const getClinicBasicInfo = (clinic) => {
  if (!clinic) return null;
  return {
    name: clinic.clinicName,
    address: clinic.address,
    type: clinic.clinicType,
    status: clinic.status,
  };
};

/**
 * Tìm chuyên khoa theo tên (fuzzy, chuẩn hóa)
 * @param {string} queryName
 * @returns {Promise<Object|null>}
 */
export const findSpecialtyByName = async (queryName) => {
  if (!queryName || queryName.length < 2) return null;

  const normalizedQuery = normalizeVietnamese(queryName);

  // Tìm chính xác không dấu
  let specialty = await Specialty.findOne({
    name: { $regex: new RegExp(`^${queryName}$`, "i") },
    status: "active",
  }).lean();
  if (specialty) return specialty;

  // Tìm gần đúng
  const allSpecialties = await Specialty.find({ status: "active" })
    .select("name description")
    .lean();
  const matched = allSpecialties.filter((s) => {
    const normalizedName = normalizeVietnamese(s.name);
    const queryWords = normalizedQuery.split(/\s+/);
    return queryWords.every((word) => normalizedName.includes(word));
  });
  if (matched.length) {
    matched.sort((a, b) => a.name.length - b.name.length);
    return matched[0];
  }
  return null;
};

/**
 * Kiểm tra một clinic có chứa một specialty không
 * @param {string} clinicId
 * @param {string} specialtyId
 * @returns {Promise<boolean>}
 */
export const clinicHasSpecialty = async (clinicId, specialtyId) => {
  const clinic = await ClinicLead.findById(clinicId)
    .select("specialties")
    .lean();
  if (!clinic) return false;
  return clinic.specialties.some(
    (id) => id.toString() === specialtyId.toString(),
  );
};

/**
 * Tìm bác sĩ theo tên (exact → text search → vector search) có populate clinicId và specialty
 * @param {string} doctorName
 * @returns {Promise<Object|null>} - { user, doctorProfile }
 */
export const findDoctorByName = async (doctorName) => {
  if (!doctorName || doctorName.length < 2) return null;

  // Bước 1: Exact match + populate
  let user = await User.findOne({
    fullName: { $regex: new RegExp(`^${doctorName}$`, "i") },
    role: "doctor",
    status: "active",
  }).populate({
    path: "doctorProfile",
    populate: [{ path: "clinicId" }, { path: "specialty" }],
  });

  if (user && user.doctorProfile) {
    return { user, doctorProfile: user.doctorProfile };
  }

  // Bước 2: Text search
  const textSearchUsers = await User.find(
    {
      $text: { $search: doctorName },
      role: "doctor",
      status: "active",
    },
    { score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(3)
    .populate({
      path: "doctorProfile",
      populate: [{ path: "clinicId" }, { path: "specialty" }],
    });

  const valid = textSearchUsers.find((u) => u.doctorProfile);
  if (valid) return { user: valid, doctorProfile: valid.doctorProfile };

  // Bước 3: Vector search (Atlas)
  try {
    const queryEmbedding = await generateEmbedding(`bác sĩ ${doctorName}`);
    if (queryEmbedding && queryEmbedding.length === 768) {
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
        // Populate clinicId và specialty cho kết quả vector
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
        const first = vectorResults[0];
        return { user: first.userInfo, doctorProfile: first };
      }
    }
  } catch (error) {
    console.error("[VectorSearch] Lỗi khi tìm bác sĩ:", error.message);
  }

  return null;
};

/**
 * Định dạng thông tin bác sĩ để trả về trong prompt
 * @param {Object} doctorProfile
 * @param {Object} user
 * @returns {Object}
 */
export const getDoctorResponseData = (doctorProfile, user) => {
  if (!doctorProfile || !user) return null;

  let clinicName = null;
  let clinicAddress = null;
  const clinic = doctorProfile.clinicId;

  if (clinic && clinic.status === "resolved") {
    clinicName = clinic.clinicName;
    clinicAddress = clinic.address || null;
  } else if (doctorProfile.customClinicName) {
    clinicName = doctorProfile.customClinicName;
    clinicAddress = null;
  }

  return {
    fullName: user.fullName,
    specialty: doctorProfile.specialty,
    experience: doctorProfile.experience,
    consultationFee: doctorProfile.consultationFee,
    bio: doctorProfile.bio,
    totalReviews: doctorProfile.totalReviews,
    sumRating: doctorProfile.sumRating,
    clinicName,
    clinicAddress,
    status: doctorProfile.status,
  };
};

/**
 * Lấy danh sách bác sĩ của một clinic (không lọc chuyên khoa)
 * @param {string} clinicId
 * @returns {Promise<Array>}
 */
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

/**
 * Kiểm tra bác sĩ có thuộc clinic cụ thể không (dựa trên clinicId hoặc customClinicName)
 * @param {Object} doctorInfo - kết quả từ getDoctorResponseData
 * @param {string} clinicName - tên clinic cần kiểm tra
 * @returns {boolean}
 */
export const doctorBelongsToClinic = (doctorInfo, clinicName) => {
  if (!doctorInfo || !clinicName) return false;
  const normalizedInput = normalizeVietnamese(clinicName);
  const doctorClinic = doctorInfo.clinicName;
  if (!doctorClinic) return false;
  const normalizedDoctorClinic = normalizeVietnamese(doctorClinic);
  return (
    normalizedDoctorClinic.includes(normalizedInput) ||
    normalizedInput.includes(normalizedDoctorClinic)
  );
};

/**
 * Tìm danh sách bác sĩ theo clinicId và specialtyId, có thể sắp xếp theo rating (bác sĩ giỏi)
 * @param {string|mongoose.Types.ObjectId} clinicId
 * @param {string|mongoose.Types.ObjectId} specialtyId
 * @param {boolean} sortByRating - true nếu ưu tiên bác sĩ có đánh giá cao
 * @returns {Promise<Array>} danh sách bác sĩ đã format chuẩn đầu ra
 */
export const findDoctorsByClinicAndSpecialty = async (
  clinicId,
  specialtyId,
  sortByRating = false,
) => {
  console.log("\n=== DEBUG: BƯỚC 2 - TRONG CLINIC LOOKUP SERVICE ===");
  console.log(
    "A. Nhận tham số -> clinicId:",
    clinicId,
    " | specialtyId:",
    specialtyId,
  );

  if (!clinicId || !specialtyId) {
    console.log("B. Hủy truy vấn vì thiếu ID");
    return [];
  }

  // LOG 1: Tìm chay KHÔNG CẦN ĐIỀU KIỆN TRẠNG THÁI để xem data gốc có tồn tại không
  const rawDoctors = await DoctorProfile.find({
    clinicId: clinicId,
    specialty: specialtyId,
  }).lean();

  console.log(
    "C. Query thô (chưa lọc status active): Tìm thấy",
    rawDoctors.length,
    "hồ sơ",
  );
  if (rawDoctors.length > 0) {
    console.log(
      "   -> Trạng thái của hồ sơ đầu tiên là:",
      rawDoctors[0].status,
    );
  }

  // LOG 2: Tìm với điều kiện status 'active' và kèm thông tin User
  const doctors = await DoctorProfile.find({
    clinicId: clinicId,
    specialty: specialtyId,
    status: "active", // Phải là bác sĩ đang active
  })
    .populate({
      path: "user",
      match: { role: "doctor", status: "active" }, // Phải có tài khoản đang active
      select: "fullName status role",
    })
    .lean();

  console.log(
    "D. Query chính thức (đã lọc active + populate User): Tìm thấy",
    doctors.length,
    "hồ sơ",
  );

  // Lọc bỏ những bác sĩ không có user đi kèm (bị reject bởi điều kiện match bên trên)
  const validDoctors = doctors.filter((doc) => doc.user);
  console.log(
    "E. Sau khi kiểm tra tài khoản User hợp lệ: Còn lại",
    validDoctors.length,
    "hồ sơ",
  );

  if (doctors.length > 0 && validDoctors.length === 0) {
    console.log(
      "   -> CẢNH BÁO: Bác sĩ có profile active nhưng tài khoản User bị khóa/chưa active hoặc sai role!",
    );
  }

  const formattedDoctors = validDoctors.map((doc) => {
    const avgRating =
      doc.totalReviews && doc.totalReviews > 0
        ? doc.sumRating / doc.totalReviews
        : 0;
    return {
      ...doc,
      avgRating,
    };
  });

  if (sortByRating) {
    formattedDoctors.sort((a, b) => b.avgRating - a.avgRating);
  } else {
    formattedDoctors.sort((a, b) => b.totalReviews - a.totalReviews);
  }

  const limitedDoctors = formattedDoctors.slice(0, 5);

  const result = [];
  for (const doc of limitedDoctors) {
    let specialtyName = null;
    if (doc.specialty) {
      const spec = await Specialty.findById(doc.specialty)
        .select("name")
        .lean();
      specialtyName = spec ? spec.name : null;
    }
    result.push({
      fullName: doc.user?.fullName || "Chưa rõ",
      specialty: doc.specialty,
      specialtyName: specialtyName,
      experience: doc.experience,
      consultationFee: doc.consultationFee,
      totalReviews: doc.totalReviews,
      avgRating: doc.avgRating,
      bio: doc.bio,
      doctorId: doc._id,
    });
  }

  console.log(
    "F. Dữ liệu mảng Bác Sĩ cuối cùng xuất ra:",
    result.length > 0 ? "Thành công" : "Rỗng []",
  );
  console.log("===================================================\n");

  return result;
};
