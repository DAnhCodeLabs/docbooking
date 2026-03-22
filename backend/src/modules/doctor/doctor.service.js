import { StatusCodes } from "http-status-codes";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../config/cloudinary.js"; // Import bộ công cụ Cloudinary
import AuditLog from "../../models/AuditLog.js";
import ClinicLead from "../../models/ClinicLead.js";
import DoctorProfile from "../../models/DoctorProfile.js";
import Specialty from "../../models/Specialty.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";
import logger from "../../utils/logger.js";
import * as clinicLeadService from "../clinicLead/clinicLead.service.js";
import * as scheduleService from "../schedule/schedule.service.js";
import { sendDoctorClinicApproved, sendDoctorRejectionEmail } from "../../utils/email.js";

export const submitDoctorOnboarding = async (
  data,
  files,
  ipAddress,
  userAgent,
) => {
  const {
    email,
    fullName,
    phone,
    specialty,
    experience,
    consultationFee,
    licenseNumber,
    bio,
    qualifications,
    clinicId,
    customClinicName,
  } = data;

  // 1. Kiểm tra email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, "Email này đã tồn tại.");
  }

  // 2. Kiểm tra clinic nếu có
  if (clinicId) {
    const clinic = await ClinicLead.findOne({
      _id: clinicId,
      status: "resolved",
    });
    if (!clinic) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Phòng khám bạn chọn không tồn tại hoặc chưa được duyệt.",
      );
    }
  }

  // 3. Upload files
  let finalAvatarUrl = null;
  let finalUploadedDocuments = [];

  try {
    // Avatar
    if (files.avatarUrl && files.avatarUrl[0]) {
      finalAvatarUrl = await uploadToCloudinary(
        files.avatarUrl[0],
        "doctor_profiles",
      );
    } else {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Vui lòng tải lên ảnh đại diện.",
      );
    }

    // Documents
    if (files.uploadedDocuments && files.uploadedDocuments.length > 0) {
      const docPromises = files.uploadedDocuments.map(async (file) => {
        const url = await uploadToCloudinary(file, "doctor_profiles");
        return { name: file.originalname, url, publicId: "" };
      });
      finalUploadedDocuments = await Promise.all(docPromises);
    } else {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Vui lòng tải lên ít nhất 1 tài liệu.",
      );
    }
  } catch (error) {
    // Rollback nếu lỗi upload
    if (finalAvatarUrl) await deleteFromCloudinary(finalAvatarUrl);
    for (const doc of finalUploadedDocuments) {
      if (doc.url) await deleteFromCloudinary(doc.url);
    }
    throw error;
  }

  // 4. Tạo user và profile
  let newUser = null;
  try {
    let parsedQualifications = qualifications;
    if (typeof qualifications === "string") {
      try {
        parsedQualifications = JSON.parse(qualifications);
      } catch (err) {
        parsedQualifications = [];
      }
    }

    newUser = await User.create({
      email,
      fullName,
      phone,
      avatar: finalAvatarUrl,
      role: "doctor",
      status: "inactive",
      emailVerified: false,
    });

    await DoctorProfile.create({
      user: newUser._id,
      specialty,
      experience,
      consultationFee,
      licenseNumber,
      bio,
      clinicId: clinicId || null,
      customClinicName: customClinicName || null,
      qualifications: parsedQualifications,
      documents: finalUploadedDocuments,
      status: "pending",
      isVerified: false,
    });

    await AuditLog.create({
      userId: newUser._id,
      action: "SUBMIT_DOCTOR_PROFILE",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: { email, licenseNumber },
    });
  } catch (error) {
    // Rollback DB và Cloudinary
    if (newUser) await User.deleteOne({ _id: newUser._id });
    if (finalAvatarUrl) await deleteFromCloudinary(finalAvatarUrl);
    for (const doc of finalUploadedDocuments) {
      if (doc.url) await deleteFromCloudinary(doc.url);
    }
    logger.error(`Lỗi khi tạo hồ sơ bác sĩ: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Có lỗi xảy ra khi lưu hồ sơ.",
    );
  }

  logger.info(`Doctor onboarding submitted successfully for email: ${email}`);
  return {
    message:
      "Nộp hồ sơ thành công! Đội ngũ quản trị sẽ xét duyệt và liên hệ lại.",
  };
};

// ==========================================\
// PUBLIC API: HIỂN THỊ DANH SÁCH BÁC SĨ (TRANG CHỦ)
// ==========================================\

export const getPublicDoctors = async (query) => {
  // 1. KẸP LỚP 1: TÌM CÁC USER HỢP LỆ VÀ KHỚP TỪ KHÓA TÌM KIẾM
  let userFilter = { role: "doctor", status: "active" };
  if (query.search) {
    userFilter.fullName = { $regex: query.search, $options: "i" };
  }
  const activeUsers = await User.find(userFilter).select("_id");
  const validUserIds = activeUsers.map((u) => u._id);

  // 2. KẸP LỚP 2: TÌM CÁC CHUYÊN KHOA ĐANG MỞ HOẠT ĐỘNG
  let specialtyFilter = { status: "active" };
  if (query.specialty) {
    specialtyFilter._id = query.specialty; // Nếu user click lọc theo 1 chuyên khoa
  }
  const activeSpecialties = await Specialty.find(specialtyFilter).select("_id");
  const validSpecialtyIds = activeSpecialties.map((s) => s._id);

  // 3. KẸP LỚP 3: QUERY BẢNG DOCTOR PROFILE
  const baseFilter = {
    status: "active",
    user: { $in: validUserIds },
    specialty: { $in: validSpecialtyIds },
  };

  if (query.clinicId) {
    baseFilter.clinicId = query.clinicId;
  }

  // MASTER DEV FIX: Tự tay build toán tử lọc Mongoose cho chính xác 100%
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    baseFilter.consultationFee = {};
    if (query.minPrice !== undefined)
      baseFilter.consultationFee.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined)
      baseFilter.consultationFee.$lte = Number(query.maxPrice);
  }

  if (query.minExperience !== undefined) {
    baseFilter.experience = { $gte: Number(query.minExperience) };
  }

  // Khởi tạo ApiFeatures với baseFilter đã nhúng sẵn bộ lọc giá & kinh nghiệm
  const features = new ApiFeatures(DoctorProfile.find(baseFilter), query)
    .sort() // Bỏ .filter() đi vì ta đã tự lọc bằng tay ở trên cực chuẩn rồi
    .paginate();

  // Populate và CHỈ LẤY THÔNG TIN CÔNG KHAI
  const doctors = await features.query
    .populate({
      path: "user",
      select: "fullName avatar",
    })
    .populate({
      path: "specialty",
      select: "name image",
    })
    .populate({
      path: "clinicId",
      select: "clinicName address",
    })
    .select("-documents -rejectionReason -verifiedAt -verifiedBy -createdAt");

  // Đếm tổng số bản ghi thỏa mãn bộ lọc để làm thanh phân trang
  const total = await DoctorProfile.countDocuments(baseFilter);

  return { doctors, total };
};

export const getPublicDoctorById = async (id, query = {}) => {
  // Lấy startDate, endDate từ query, mặc định từ hôm nay đến +30 ngày
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const defaultEndDate = new Date(today);
  defaultEndDate.setUTCDate(defaultEndDate.getUTCDate() + 30);
  defaultEndDate.setUTCHours(23, 59, 59, 999);

  let startDate = today;
  let endDate = defaultEndDate;

  if (query.startDate) {
    startDate = new Date(query.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
  }
  if (query.endDate) {
    endDate = new Date(query.endDate);
    endDate.setUTCHours(23, 59, 59, 999);
  }

  // Lấy doctor profile
  const doctor = await DoctorProfile.findOne({ _id: id, status: "active" })
    .populate({
      path: "user",
      match: { status: "active" },
      select: "fullName avatar gender phone", // phone có thể che sau
    })
    .populate({
      path: "specialty",
      match: { status: "active" },
      select: "name description",
    })
    .populate({
      path: "clinicId",
      select: "clinicName address",
    })
    .select(
      "-documents -rejectionReason -verifiedAt -verifiedBy -createdAt -updatedAt",
    ); // ẩn các trường nhạy cảm

  // Kiểm tra tồn tại và user/specialty vẫn active
  if (!doctor || !doctor.user || !doctor.specialty) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy thông tin bác sĩ hoặc bác sĩ này đang tạm ngừng tiếp nhận bệnh nhân.",
    );
  }

  // Lấy schedules
  const schedules = await scheduleService.getDoctorSchedules(
    doctor.user._id,
    startDate,
    endDate,
  );

  // Trả về kết quả
  return {
    ...doctor.toObject(),
    schedules,
  };
};

// ==================== CẬP NHẬT HỒ SƠ ====================
export const updateProfile = async (
  doctorId,
  updateData,
  ipAddress,
  userAgent,
) => {
  const doctorProfile = await DoctorProfile.findOne({
    user: doctorId,
  }).populate("user");
  if (!doctorProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ bác sĩ.");
  }
  if (doctorProfile.status !== "active") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản chưa được kích hoạt hoặc đang bị khóa.",
    );
  }

  const user = await User.findById(doctorId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy người dùng.");
  }

  // Các trường được phép cập nhật
  const allowedUserFields = [
    "fullName",
    "phone",
    "avatar",
    "gender",
    "dateOfBirth",
    "address",
  ];
  const allowedDoctorFields = [
    "experience",
    "bio",
    "consultationFee",
    "clinicId",
    "customClinicName",
  ];

  allowedUserFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  allowedDoctorFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      doctorProfile[field] = updateData[field];
    }
  });

  // Kiểm tra clinicId
  // Kiểm tra clinicId
  if (updateData.clinicId) {
    const clinic = await ClinicLead.findOne({
      _id: updateData.clinicId,
      status: "resolved",
    });
    if (!clinic) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Phòng khám không tồn tại hoặc chưa được duyệt.",
      );
    }
    doctorProfile.customClinicName = null;
  } else if (updateData.customClinicName) {
    doctorProfile.clinicId = null;
  }

  await user.save();
  await doctorProfile.save();

  await AuditLog.create({
    userId: doctorId,
    action: "PROFILE_UPDATE",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { updatedFields: Object.keys(updateData) },
  });

  const updatedProfile = await DoctorProfile.findById(doctorProfile._id)
    .populate("user", "-password")
    .populate("specialty", "name")
    .populate("clinicId", "clinicName address");

  return {
    message: "Cập nhật hồ sơ thành công.",
    profile: updatedProfile,
  };
};

// ==================== UPLOAD DOCUMENT ====================
export const uploadDocument = async (doctorId, file, ipAddress, userAgent) => {
  const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
  if (!doctorProfile)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");

  // 1. Upload lên Cloudinary
  const url = await uploadToCloudinary(file, "doctor_documents");

  // Lấy publicId từ URL để lưu
  const publicId = url.match(/\/v\d+\/(.+?)\.\w+$/)?.[1];

  // 2. Lưu vào Database (Sử dụng Try-Catch để Rollback)
  try {
    doctorProfile.documents.push({
      name: file.originalname,
      url: url,
      publicId: publicId,
    });

    await doctorProfile.save();

    await AuditLog.create({
      userId: doctorId,
      action: "DOCUMENT_ADD",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: { url },
    });

    return {
      message: "Tải lên tài liệu thành công.",
      document: {
        name: file.originalname,
        url,
        publicId,
      },
    };
  } catch (error) {
    // FIX CRITICAL: Xóa ảnh rác trên Cloudinary nếu DB lưu thất bại
    logger.error(
      `Lỗi DB khi uploadDocument, tiến hành rollback Cloudinary: ${url}`,
    );
    await deleteFromCloudinary(url).catch(() => {});

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Có lỗi xảy ra khi lưu tài liệu. Vui lòng thử lại.",
    );
  }
};

// ==================== XÓA DOCUMENT ====================
export const deleteDocument = async (
  doctorId,
  publicId,
  ipAddress,
  userAgent,
) => {
  const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
  if (!doctorProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");
  }

  if (doctorProfile.documents.length <= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Không thể xóa. Bạn bắt buộc phải duy trì ít nhất 01 tài liệu/chứng chỉ hành nghề trên hệ thống.",
    );
  }

  const docIndex = doctorProfile.documents.findIndex(
    (doc) => doc.publicId === publicId,
  );
  if (docIndex === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy tài liệu này.");
  }

  const doc = doctorProfile.documents[docIndex];
  try {
    await deleteFromCloudinary(doc.url);
  } catch (error) {
    logger.error(`Xóa file Cloudinary thất bại: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không thể xóa file trên hệ thống lưu trữ. Vui lòng thử lại sau.",
    );
  }

  doctorProfile.documents.splice(docIndex, 1);
  await doctorProfile.save();

  await AuditLog.create({
    userId: doctorId,
    action: "DOCUMENT_REMOVE",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { publicId },
  });

  return { message: "Xóa tài liệu thành công." };
};

// ==================== UPLOAD ACTIVITY IMAGE ====================
export const uploadActivityImage = async (
  doctorId,
  file,
  ipAddress,
  userAgent,
) => {
  const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
  if (!doctorProfile || doctorProfile.status !== "active") {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không thể thực hiện.");
  }

  const url = await uploadToCloudinary(file, "doctor_activities");
  const publicId = url.match(/\/v\d+\/(.+?)\.\w+$/)?.[1];

  const newImage = { url, publicId };
  doctorProfile.activityImages.push(newImage);
  await doctorProfile.save();

  await AuditLog.create({
    userId: doctorId,
    action: "ACTIVITY_IMAGE_ADD",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { fileName: file.originalname, url },
  });

  return {
    message: "Tải lên ảnh hoạt động thành công.",
    image: { url, publicId },
  };
};

// ==================== XÓA ACTIVITY IMAGE ====================
export const deleteActivityImage = async (
  doctorId,
  publicId,
  ipAddress,
  userAgent,
) => {
  const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
  if (!doctorProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ.");
  }

  const imgIndex = doctorProfile.activityImages.findIndex(
    (img) => img.publicId === publicId,
  );
  if (imgIndex === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy ảnh này.");
  }

  const img = doctorProfile.activityImages[imgIndex];
  try {
    await deleteFromCloudinary(img.url);
  } catch (error) {
    logger.error(`Xóa file Cloudinary thất bại: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Không thể xóa file trên hệ thống lưu trữ. Vui lòng thử lại sau.",
    );
  }

  doctorProfile.activityImages.splice(imgIndex, 1);
  await doctorProfile.save();

  await AuditLog.create({
    userId: doctorId,
    action: "ACTIVITY_IMAGE_REMOVE",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { publicId },
  });

  return { message: "Xóa ảnh hoạt động thành công." };
};

export const getMyProfile = async (doctorId) => {
  const doctorProfile = await DoctorProfile.findOne({ user: doctorId })
    .populate("user", "fullName email phone avatar gender dateOfBirth address") // Lấy đủ thông tin
    .populate("specialty", "name")
    .populate("clinicId", "clinicName address");

  if (!doctorProfile) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ bác sĩ.");
  }
  return doctorProfile;
};

export const getClinicDoctors = async (userId, query) => {
  const clinic = await clinicLeadService.getClinicByUserId(userId);
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Không tìm thấy phòng khám liên kết.",
    );
  }

  const filter = {
    $or: [{ clinicId: clinic._id }, { customClinicName: clinic.clinicName }],
  };

  // Xử lý search: tìm user có fullName/email/phone chứa search
  let userIds = [];
  if (query.search) {
    const users = await User.find({
      $or: [
        { fullName: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
        { phone: { $regex: query.search, $options: "i" } },
      ],
    }).select("_id");
    userIds = users.map((u) => u._id);
    filter.user = { $in: userIds };
  }

  if (query.status) filter.status = query.status;
  if (query.specialty) filter.specialty = query.specialty;

  const features = new ApiFeatures(DoctorProfile.find(filter), query)
    .sort()
    .paginate();

  const doctors = await features.query
    .populate("user", "fullName email phone avatar status")
    .populate("specialty", "name");

  const total = await DoctorProfile.countDocuments(filter);

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;

  return { doctors, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const approveDoctorByClinic = async (
  userId,
  doctorId,
  ipAddress,
  userAgent,
) => {
  const clinic = await clinicLeadService.getClinicByUserId(userId);
  if (!clinic)
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Không tìm thấy phòng khám liên kết.",
    );

  const doctor = await DoctorProfile.findById(doctorId).populate(
    "user",
    "email fullName",
  );
  if (!doctor)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bác sĩ.");

  if (!isDoctorBelongsToClinic(doctor, clinic)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền duyệt bác sĩ này.",
    );
  }

  if (doctor.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Bác sĩ này đã được xử lý trước đó.",
    );
  }

  const updated = await DoctorProfile.findOneAndUpdate(
    { _id: doctorId, status: "pending" },
    {
      status: "pending_admin_approval",
      verifiedBy: userId, // ghi nhận ai đã xác nhận từ clinic
      verifiedAt: new Date(),
    },
    { new: true },
  );

  if (!updated)
    throw new ApiError(StatusCodes.BAD_REQUEST, "Không thể xác nhận bác sĩ.");

  await AuditLog.create({
    userId,
    action: "APPROVE_DOCTOR_BY_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      doctorId: doctor._id,
      doctorName: doctor.user.fullName,
      clinicName: clinic.clinicName,
    },
  });

  try {
    await sendDoctorClinicApproved(
      doctor.user.email,
      doctor.user.fullName,
      clinic.clinicName,
    );
  } catch (error) {
    logger.error(
      `Gửi email thông báo xác nhận bác sĩ thất bại: ${error.message}`,
    );
  }

  return {
    message:
      "Đã xác nhận hồ sơ bác sĩ. Hồ sơ sẽ được chuyển đến nền tảng để kiểm duyệt lần cuối.",
  };
};

export const getClinicDoctorDetail = async (doctorId, userId) => {
  // 1. Tìm clinic của user
  const clinic = await clinicLeadService.getClinicByUserId(userId);
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào.",
    );
  }

  // 2. Tìm doctor profile
  const doctor = await DoctorProfile.findById(doctorId)
    .populate("user", "fullName email phone avatar gender dateOfBirth address")
    .populate("specialty", "name description")
    .populate("clinicId", "clinicName address")
    .lean();

  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bác sĩ.");
  }

  // 3. Kiểm tra bác sĩ có thuộc phòng khám của clinic admin không
  const isOwnDoctor =
    (doctor.clinicId &&
      doctor.clinicId._id.toString() === clinic._id.toString()) ||
    (doctor.customClinicName && doctor.customClinicName === clinic.clinicName);

  if (!isOwnDoctor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền xem thông tin bác sĩ này.",
    );
  }

  return doctor;
};


export const confirmDoctor = async (doctorId, userId, ipAddress, userAgent) => {
  // 1. Lấy clinic và kiểm tra quyền
  const clinic = await clinicLeadService.getClinicByUserId(userId);
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào.",
    );
  }

  const doctor = await DoctorProfile.findById(doctorId).populate("user");
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bác sĩ.");
  }

  // Kiểm tra thuộc phòng khám
  const isOwnDoctor =
    (doctor.clinicId && doctor.clinicId.toString() === clinic._id.toString()) ||
    (doctor.customClinicName && doctor.customClinicName === clinic.clinicName);

  if (!isOwnDoctor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền xác nhận bác sĩ này.",
    );
  }

  // Chỉ được xác nhận khi status = pending
  if (doctor.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Bác sĩ đang ở trạng thái ${doctor.status}, không thể xác nhận.`,
    );
  }

  // Cập nhật status
  doctor.status = "pending_admin_approval";
  await doctor.save();

  // Ghi audit log
  await AuditLog.create({
    userId: userId,
    action: "CONFIRM_DOCTOR_BY_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { doctorId: doctor._id, doctorEmail: doctor.user?.email },
  });

  // (Tuỳ chọn) Gửi email thông báo cho admin nền tảng – có thể thêm sau

  return {
    message:
      "Xác nhận nhân sự thành công. Hồ sơ đã chuyển sang chờ Admin nền tảng duyệt.",
  };
};

/**
 * Clinic admin từ chối bác sĩ (chuyển từ pending -> rejected)
 */
export const rejectDoctorByClinic = async (
  doctorId,
  userId,
  reason,
  ipAddress,
  userAgent,
) => {
  const clinic = await clinicLeadService.getClinicByUserId(userId);
  if (!clinic) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Tài khoản không liên kết với phòng khám nào.",
    );
  }

  const doctor = await DoctorProfile.findById(doctorId).populate("user");
  if (!doctor) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy bác sĩ.");
  }

  const isOwnDoctor =
    (doctor.clinicId && doctor.clinicId.toString() === clinic._id.toString()) ||
    (doctor.customClinicName && doctor.customClinicName === clinic.clinicName);

  if (!isOwnDoctor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Bạn không có quyền từ chối bác sĩ này.",
    );
  }

  if (doctor.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Bác sĩ đang ở trạng thái ${doctor.status}, không thể từ chối.`,
    );
  }

  // Cập nhật status và lưu lý do
  doctor.status = "rejected";
  doctor.rejectionReason = reason || "Từ chối bởi phòng khám";
  await doctor.save();

  // Ghi audit log
  await AuditLog.create({
    userId: userId,
    action: "REJECT_DOCTOR_BY_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: { doctorId: doctor._id, doctorEmail: doctor.user?.email, reason },
  });

  // Gửi email thông báo từ chối (nếu có email)
  if (doctor.user?.email) {
    await sendDoctorRejectionEmail(
      doctor.user.email,
      reason || "Từ chối bởi phòng khám",
    );
  }

  return { message: "Đã từ chối hồ sơ bác sĩ." };
};