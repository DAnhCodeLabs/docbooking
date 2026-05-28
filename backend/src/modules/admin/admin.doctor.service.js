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
      if (statusParam === "pending") {
        filter.status = { $in: ["pending", "pending_admin_approval"] };
      } else {
        filter.status = statusParam;
      }
    }
  } else {
    filter.status = { $in: ["pending", "pending_admin_approval"] };
  }

  // Tái thiết kế bộ lọc tìm kiếm text-search thích ứng cả trạng thái trước và sau khi kích hoạt tài khoản
  if (search) {
    const matchedUsers = await User.find({
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    const userIds = matchedUsers.map((u) => u._id);

    filter.$or = [
      { user: { $in: userIds } },
      { "applicantInfo.fullName": { $regex: search, $options: "i" } },
      { "applicantInfo.email": { $regex: search, $options: "i" } },
    ];
  }

  let dbQuery = DoctorProfile.find(filter)
    .populate({
      path: "user",
      select: "fullName email phone avatar",
    })
    .populate("specialty", "name")
    .populate("clinicId", "clinicName address")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const applications = await dbQuery.exec();
  const total = await DoctorProfile.countDocuments(filter);

  // Áp dụng kỹ thuật Virtual Injector để đồng bộ hóa giao diện quản trị cũ, triệt tiêu side-effects
  const normalizedApplications = applications.map((app) => {
    const appObj = app.toObject();
    if (!appObj.user && appObj.applicantInfo) {
      appObj.user = {
        fullName: appObj.applicantInfo.fullName,
        email: appObj.applicantInfo.email,
        phone: appObj.applicantInfo.phone,
        avatar: appObj.applicantInfo.avatar,
        isProvisional: true, // Cờ đánh dấu tài khoản ảo phục vụ frontend phân biệt đồ họa hiển thị
      };
    }
    return appObj;
  });

  return { applications: normalizedApplications, total };
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

  // Kiểm soát trạng thái chặt chẽ theo phân loại loại hình công tác
  const isClinicDoctor = !!profile.clinicId;
  if (isClinicDoctor && profile.status !== "pending_admin_approval") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Hồ sơ này đang ở trạng thái ${profile.status}, không thể xử lý. Bác sĩ trực thuộc phòng khám bắt buộc cần được cơ sở xác nhận trước.`,
    );
  }
  if (!isClinicDoctor && profile.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Hồ sơ độc lập này đang ở trạng thái ${profile.status}, không thể xử lý xử duyệt hành động.`,
    );
  }

  // ================================================================
  // TRƯỜNG HỢP 1: ADMIN PHÊ DUYỆT (KÍCH HOẠT TÀI KHOẢN VÀ CẤP PHÁT QUYỀN TRUY CẬP)
  // ================================================================
  if (action === "approve") {
    const applicant = profile.applicantInfo;
    if (!applicant) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Hồ sơ không có thông tin ứng viên hợp lệ để khởi tạo tài khoản.",
      );
    }

    const plainPassword = crypto.randomBytes(10).toString("hex");

    // ĐỀ PHÒNG ĐIỂM MÙ XUNG ĐỘT (UPSERT ROLE): Nếu email đã đăng ký tài khoản bệnh nhân trước đó
    let user = await User.findOne({ email: applicant.email });
    let isNewUserCreated = false;
    let oldUserSnapshot = null;

    if (user) {
      // Sao lưu trạng thái cũ để Rollback thủ công nếu luồng sau lỗi
      oldUserSnapshot = {
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        requiresPasswordChange: user.requiresPasswordChange,
      };
      // Tiến hành nâng cấp đặc quyền trực tiếp trên tài khoản cũ thành Bác sĩ
      user.role = "doctor";
      user.status = "active";
      user.emailVerified = true;
      user.requiresPasswordChange = true;
      await user.save();
    } else {
      // Khởi tạo tài khoản hoàn toàn mới từ dữ liệu thô đã đóng băng trong hồ sơ
      user = await User.create({
        email: applicant.email,
        password: plainPassword,
        fullName: applicant.fullName,
        phone: applicant.phone,
        avatar: applicant.avatar,
        role: "doctor",
        status: "active",
        emailVerified: true,
        requiresPasswordChange: true,
      });
      isNewUserCreated = true;
    }

    const oldProfileSnapshot = {
      status: profile.status,
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy,
      user: profile.user,
    };

    try {
      // Cập nhật liên kết khóa ngoại và đổi trạng thái hồ sơ hoạt động
      profile.user = user._id;
      profile.status = "active";
      profile.isVerified = true;
      profile.verifiedAt = new Date();
      profile.verifiedBy = adminId;
      await profile.save();

      await AuditLog.create({
        action: "APPROVE_DOCTOR_PROFILE",
        status: "SUCCESS",
        userId: adminId,
        ipAddress,
        userAgent,
        details: { doctorUserId: user._id, doctorEmail: user.email },
      });

      // Phát hành email chứa mật khẩu đăng nhập ngẫu nhiên sang Bác sĩ
      await sendDoctorApprovalEmail(user.email, plainPassword);
    } catch (error) {
      // CHIẾN LƯỢC MANUAL ROLLBACK TOÀN VẸN: Khôi phục sạch sẽ dữ liệu nếu gián đoạn mạng hoặc Mail Server chết
      if (isNewUserCreated && user) {
        await User.deleteOne({ _id: user._id }).catch(() => {});
      } else if (user && oldUserSnapshot) {
        Object.assign(user, oldUserSnapshot);
        await user.save().catch(() => {});
      }

      Object.assign(profile, oldProfileSnapshot);
      await profile.save().catch(() => {});

      logger.error(
        `Lỗi hệ thống trong luồng duyệt hồ sơ bác sĩ: ${error.message}`,
      );
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Đã xảy ra sự cố trong quá trình duyệt cấp tài khoản. Hệ thống tự động rollback an toàn. Vui lòng thử lại.",
      );
    }
  }

  // ================================================================
  // TRƯỜNG HỢP 2: ADMIN TỪ CHỐI HỒ SƠ (TỪ CHỐI TRÊN DỮ LIỆU THÔ)
  // ================================================================
  else if (action === "reject") {
    const targetEmail = profile.user
      ? profile.user.email
      : profile.applicantInfo?.email;
    const targetAvatar = profile.user
      ? profile.user.avatar
      : profile.applicantInfo?.avatar;

    profile.status = "rejected";
    profile.rejectionReason = reason;
    profile.rejectedAt = new Date();
    profile.rejectedBy = adminId;
    await profile.save();

    await AuditLog.create({
      action: "REJECT_DOCTOR_PROFILE",
      status: "SUCCESS",
      userId: adminId,
      ipAddress,
      userAgent,
      details: {
        doctorId: profile.user?._id || null,
        doctorEmail: targetEmail,
        reason: reason,
      },
    });

    if (targetEmail) {
      await sendDoctorRejectionEmail(targetEmail, reason);
    }

    // Tiến hành giải phóng tài nguyên lưu trữ rác trên Cloudinary ngay lập tức
    try {
      if (targetAvatar) {
        await deleteFromCloudinary(targetAvatar);
      }
      if (profile.documents && profile.documents.length > 0) {
        for (const doc of profile.documents) {
          if (doc.url) {
            await deleteFromCloudinary(doc.url);
          }
        }
      }
    } catch (cloudinaryError) {
      logger.error(
        `Lỗi giải phóng Cloudinary khi từ chối hồ sơ bác sĩ ${targetEmail}: ${cloudinaryError.message}`,
      );
    }
  }

  logger.info(
    `Quản trị viên ${adminId} đã xử lý hành động [${action}] đối với hồ sơ ứng viên.`,
  );

  return {
    message:
      action === "approve"
        ? "Đã DUYỆT hồ sơ thành công. Tài khoản User chính thức đã được thiết lập và cấp mật khẩu qua Email."
        : "Đã TỪ CHỐI hồ sơ đăng ký thành công. Hệ thống đã gửi email thông báo giải trình lý do.",
  };
};
