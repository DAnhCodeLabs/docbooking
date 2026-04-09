import { StatusCodes } from "http-status-codes";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../config/cloudinary.js";
import AuditLog from "../../models/AuditLog.js";
import Specialty from "../../models/Specialty.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";
import logger from "../../utils/logger.js";

// 1. LẤY DANH SÁCH (Hỗ trợ phân trang, tìm kiếm)
export const getSpecialties = async (query) => {
  const baseQuery = Specialty.find();
  const features = new ApiFeatures(baseQuery, query)
    .search() // Tìm theo tên
    .filter() // Lọc theo status
    .sort()
    .paginate();

  const specialties = await features.query;
  const total = await features.countTotal(Specialty);

  return { specialties, total };
};

// 2. THÊM MỚI CHUYÊN KHOA
export const createSpecialty = async (data, adminId, ipAddress, userAgent) => {
  const existing = await Specialty.findOne({
    name: data.name,
  }).collation({ locale: "vi", strength: 2 });

  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Chuyên khoa "${data.name}" đã tồn tại.`,
    );
  }

  let imageUrl = null;
  if (data.file) {
    imageUrl = await uploadToCloudinary(data.file, "specialties");
  }

  try {
    const newSpecialty = await Specialty.create({
      name: data.name,
      description: data.description,
      image: imageUrl,
    });

    await AuditLog.create({
      action: "CREATE_SPECIALTY",
      status: "SUCCESS",
      userId: adminId,
      ipAddress,
      userAgent,
      details: { specialtyId: newSpecialty._id, name: newSpecialty.name },
    });

    logger.info(
      `Admin ${adminId} đã tạo chuyên khoa mới: ${newSpecialty.name}`,
    );
    return { message: "Thêm chuyên khoa thành công.", specialty: newSpecialty };
  } catch (error) {
    // Rollback: xóa ảnh nếu đã upload
    if (imageUrl) {
      await deleteFromCloudinary(imageUrl).catch(() => {});
    }
    throw error; // để errorHandler xử lý
  }
};

export const updateSpecialty = async (
  id,
  data,
  adminId,
  ipAddress,
  userAgent,
) => {
  const specialty = await Specialty.findById(id);
  if (!specialty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy chuyên khoa.");
  }

  if (data.name) {
    const existing = await Specialty.findOne({
      name: data.name,
      _id: { $ne: id },
    }).collation({ locale: "vi", strength: 2 });

    if (existing) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Chuyên khoa "${data.name}" đã tồn tại.`,
      );
    }
    specialty.name = data.name;
  }

  // Xử lý ảnh: upload ảnh mới trước, nếu thành công mới xóa ảnh cũ và cập nhật DB
  let newImageUrl = null;
  let oldImageUrl = specialty.image;

  if (data.file) {
    try {
      newImageUrl = await uploadToCloudinary(data.file, "specialties");
    } catch (uploadError) {
      logger.error(`Upload ảnh thất bại: ${uploadError.message}`);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Không thể tải ảnh lên, vui lòng thử lại.",
      );
    }
  }

  // Cập nhật các trường (trừ image tạm thời)
  if (data.description !== undefined) specialty.description = data.description;

  // Nếu có ảnh mới, thay thế
  if (newImageUrl) {
    specialty.image = newImageUrl;
  }

  try {
    await specialty.save();
  } catch (dbError) {
    // Rollback: nếu có ảnh mới, xóa nó
    if (newImageUrl) {
      await deleteFromCloudinary(newImageUrl).catch(() => {});
    }
    throw dbError;
  }

  // Sau khi DB lưu thành công, mới xóa ảnh cũ
  if (oldImageUrl && newImageUrl) {
    await deleteFromCloudinary(oldImageUrl).catch(() => {});
  }

  await AuditLog.create({
    action: "UPDATE_SPECIALTY",
    status: "SUCCESS",
    userId: adminId,
    ipAddress,
    userAgent,
    details: { specialtyId: specialty._id },
  });

  return { message: "Cập nhật chuyên khoa thành công." };
};

// 4. XÓA MỀM / KÍCH HOẠT LẠI (TOGGLE STATUS)
export const toggleSpecialtyStatus = async (
  id,
  action,
  adminId,
  ipAddress,
  userAgent,
) => {
  const specialty = await Specialty.findById(id);
  if (!specialty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy chuyên khoa.");
  }

  // Chuyển action thành status tương ứng
  const newStatus = action === "deactivate" ? "inactive" : "active";

  if (specialty.status === newStatus) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Chuyên khoa này đang ở trạng thái ${newStatus} rồi.`,
    );
  }

   // Nếu là deactivate, kiểm tra xem có bác sĩ active nào đang dùng chuyên khoa này không
 if (action === "deactivate") {
   const DoctorProfile = (await import("../../models/DoctorProfile.js")).default;
   const activeDoctors = await DoctorProfile.countDocuments({
     specialty: id,
     status: "active",
   });
   if (activeDoctors > 0) {
     throw new ApiError(
       StatusCodes.CONFLICT,
       `Không thể vô hiệu hóa chuyên khoa vì còn ${activeDoctors} bác sĩ đang hoạt động thuộc chuyên khoa này. Vui lòng chuyển bác sĩ sang chuyên khoa khác hoặc vô hiệu hóa họ trước.`,
     );
   }
 }

  // Thực hiện Xóa mềm (Đổi trạng thái)
  specialty.status = newStatus;
  await specialty.save();

  // Ghi Log
  const logAction =
    action === "deactivate" ? "DEACTIVATE_SPECIALTY" : "REACTIVATE_SPECIALTY";
  await AuditLog.create({
    action: logAction,
    status: "SUCCESS",
    userId: adminId,
    ipAddress,
    userAgent,
    details: { specialtyId: specialty._id, newStatus },
  });

  const msg =
    action === "deactivate"
      ? "Đã vô hiệu hóa (xóa mềm) chuyên khoa thành công."
      : "Đã kích hoạt lại chuyên khoa thành công.";

  return { message: msg };
};
