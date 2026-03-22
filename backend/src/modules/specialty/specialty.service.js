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
    name: { $regex: new RegExp(`^${data.name}$`, "i") },
  });
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

  logger.info(`Admin ${adminId} đã tạo chuyên khoa mới: ${newSpecialty.name}`);
  return { message: "Thêm chuyên khoa thành công.", specialty: newSpecialty };
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

  if (data.name && data.name !== specialty.name) {
    const existing = await Specialty.findOne({
      name: { $regex: new RegExp(`^${data.name}$`, "i") },
    });
    if (existing) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Tên chuyên khoa "${data.name}" đã được sử dụng.`,
      );
    }
    specialty.name = data.name;
  }

  // Xử lý ảnh mới
  if (data.file) {
    // Xóa ảnh cũ nếu có
    if (specialty.image) {
      await deleteFromCloudinary(specialty.image).catch(() => {});
    }
    // Upload ảnh mới
    specialty.image = await uploadToCloudinary(data.file, "specialties");
  }

  if (data.description !== undefined) specialty.description = data.description;

  await specialty.save();

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
