import crypto from "crypto";
import { StatusCodes } from "http-status-codes";
import { deleteFromCloudinary } from "../../config/cloudinary.js";
import AuditLog from "../../models/AuditLog.js";
import DoctorProfile from "../../models/DoctorProfile.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import {
  sendDoctorApprovalEmail,
  sendDoctorRejectionEmail,
} from "../../utils/email.js";
import logger from "../../utils/logger.js";

// ==========================================
// NGHIỆP VỤ: QUẢN LÝ HỒ SƠ BÁC SĨ
// ==========================================
export const getDoctorApplications = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const { search, status: statusParam } = query;
  const skip = (page - 1) * limit;

  let filter = {};
  if (statusParam) {
    if (Array.isArray(statusParam)) {
      filter.status = { $in: statusParam };
    } else {
      // Nếu status là "pending", lấy cả pending và pending_admin_approval
      if (statusParam === "pending") {
        filter.status = { $in: ["pending", "pending_admin_approval"] };
      } else {
        filter.status = statusParam;
      }
    }
  } else {
    // Mặc định: lấy cả pending và pending_admin_approval
    filter.status = { $in: ["pending", "pending_admin_approval"] };
  }

  // Xây dựng điều kiện populate user với match nếu có search
  let populateMatch = {};
  if (search) {
    populateMatch = {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
  }

  let dbQuery = DoctorProfile.find(filter)
    .populate({
      path: "user",
      select: "fullName email phone avatar",
      match: populateMatch,
    })
    .populate("specialty", "name")
    .populate("clinicId", "clinicName address")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const applications = await dbQuery.exec();

  // Không lọc bỏ profile có user null, giữ nguyên để admin thấy
  // Nhưng vẫn đánh dấu để frontend hiển thị "Chưa liên kết tài khoản"
  const total = await DoctorProfile.countDocuments(filter);

  // Trả về tất cả applications, kể cả user null
  return { applications, total };
};
export const getDoctorApplicationById = async (profileId) => {
  const profile = await DoctorProfile.findById(profileId)
    .populate("user")
    .populate("specialty", "name description")
    .populate("clinicId", "clinicName address clinicType image");

  if (!profile) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy hồ sơ bác sĩ này.",
    );
  }
  return profile;
};

export const processDoctorApplication = async (
  profileId,
  action,
  reason,
  adminId,
  ipAddress,
  userAgent,
) => {
  const profile = await DoctorProfile.findById(profileId).populate("user");
  if (!profile)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy hồ sơ bác sĩ.");

  // Sửa điều kiện: chỉ cho phép xử lý hồ sơ đang ở trạng thái "pending_admin_approval"
  if (profile.status !== "pending_admin_approval") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Hồ sơ này đang ở trạng thái ${profile.status}, không thể xử lý.`,
    );
  }

  // 2. Tìm tài khoản User liên kết
  const user = await User.findById(profile.user._id);
  if (!user)
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy tài khoản liên kết với hồ sơ này.",
    );

  // Lưu tạm dữ liệu cũ để Rollback cho luồng DUYỆT (Approve)
  const oldUserObj = {
    password: user.password,
    status: user.status,
    emailVerified: user.emailVerified,
    requiresPasswordChange: user.requiresPasswordChange,
  };
  const oldProfileObj = {
    status: profile.status,
    isVerified: profile.isVerified,
    verifiedBy: profile.verifiedBy,
  };

  try {
    if (action === "approve") {
      // ================================================================
      // TRƯỜNG HỢP 1: ADMIN BẤM DUYỆT HỒ SƠ (ROLLBACK THỦ CÔNG)
      // ================================================================
      const plainPassword = crypto.randomBytes(10).toString("hex");

      // Lưu trạng thái cũ để rollback nếu cần
      const oldUserObj = {
        password: user.password,
        status: user.status,
        emailVerified: user.emailVerified,
        requiresPasswordChange: user.requiresPasswordChange,
      };
      const oldProfileObj = {
        status: profile.status,
        isVerified: profile.isVerified,
        verifiedBy: profile.verifiedBy,
      };

      try {
        // Cập nhật user
        user.password = plainPassword;
        user.status = "active";
        user.emailVerified = true;
        user.requiresPasswordChange = true;
        await user.save();

        // Cập nhật profile
        profile.status = "active";
        profile.isVerified = true;
        profile.verifiedAt = new Date();
        profile.verifiedBy = adminId;
        await profile.save();

        // Ghi audit log
        await AuditLog.create({
          action: "APPROVE_DOCTOR_PROFILE",
          status: "SUCCESS",
          userId: adminId,
          ipAddress,
          userAgent,
          details: { doctorUserId: user._id, doctorEmail: user.email },
        });

        // Gửi email thông báo
        await sendDoctorApprovalEmail(user.email, plainPassword);
      } catch (error) {
        // Rollback thủ công: khôi phục dữ liệu cũ
        Object.assign(user, oldUserObj);
        await user.save().catch(() => {});
        Object.assign(profile, oldProfileObj);
        await profile.save().catch(() => {});

        logger.error(`Lỗi khi duyệt hồ sơ bác sĩ: ${error.message}`);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Có lỗi xảy ra khi duyệt hồ sơ. Vui lòng thử lại.",
        );
      }
    } else if (action === "reject") {
      // ================================================================
      // TRƯỜNG HỢP 2: ADMIN TỪ CHỐI HỒ SƠ (SOFT DELETE)
      // Giữ lại dữ liệu, chỉ đánh dấu trạng thái rejected
      // ================================================================

      // Cập nhật trạng thái DoctorProfile
      profile.status = "rejected";
      profile.rejectionReason = reason; // cần thêm field này? Nếu model chưa có thì thêm
      profile.rejectedAt = new Date();
      profile.rejectedBy = adminId;
      await profile.save();

      // User giữ nguyên trạng thái inactive (không kích hoạt), có thể thêm rejected flag nếu muốn
      // Không cần thay đổi user

      // Ghi audit log
      await AuditLog.create({
        action: "REJECT_DOCTOR_PROFILE",
        status: "SUCCESS",
        userId: adminId,
        ipAddress,
        userAgent,
        details: {
          doctorId: user._id,
          doctorEmail: user.email,
          reason: reason,
        },
      });

      // Gửi email thông báo từ chối
      await sendDoctorRejectionEmail(user.email, reason);

      // Xóa ảnh trên Cloudinary (tùy chọn, vẫn nên xóa để tiết kiệm chi phí)
      try {
        if (user.avatar) {
          await deleteFromCloudinary(user.avatar);
        }
        if (profile.documents && profile.documents.length > 0) {
          for (const doc of profile.documents) {
            if (doc.url) {
              await deleteFromCloudinary(doc.url);
            }
          }
        }
      } catch (cloudinaryError) {
        // Chỉ log lỗi, không ảnh hưởng đến nghiệp vụ chính
        logger.error(
          `Lỗi xóa ảnh Cloudinary khi reject doctor ${user.email}: ${cloudinaryError.message}`,
        );
      }
    }
  } catch (error) {
    // Kỹ thuật Manual Rollback (Chỉ áp dụng khi đang Duyệt mà bị lỗi)
    if (action === "approve") {
      Object.assign(user, oldUserObj);
      await user.save().catch(() => {});
      Object.assign(profile, oldProfileObj);
      await profile.save().catch(() => {});
    }

    // Nếu hành động là "Từ chối" mà bị lỗi, ta không cần rollback vì dữ liệu cũ vẫn nằm đó, chưa bị xóa đi.

    logger.error(`Lỗi khi xử lý hồ sơ bác sĩ: ${error.message}`);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Có lỗi xảy ra khi xử lý hồ sơ. Vui lòng thử lại.",
    );
  }

  logger.info(`Admin ${adminId} đã ${action} hồ sơ của ${user.email}`);

  return {
    message:
      action === "approve"
        ? "Đã DUYỆT hồ sơ thành công. Mật khẩu đã được sinh ra và gửi qua Email."
        : "Đã TỪ CHỐI hồ sơ và xóa dữ liệu thành công. Đã gửi thông báo qua Email.",
  };
};
