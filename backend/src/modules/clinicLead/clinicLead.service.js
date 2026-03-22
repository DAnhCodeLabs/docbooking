import { StatusCodes } from "http-status-codes";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import AuditLog from "../../models/AuditLog.js";
import ClinicLead from "../../models/ClinicLead.js";
import DoctorProfile from "../../models/DoctorProfile.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import ApiFeatures from "../../utils/ApiFeatures.js";
import { sendClinicAdminCredentials, sendEmail } from "../../utils/email.js";
import logger from "../../utils/logger.js";
import { generateContractPDF } from "../../utils/pdf.js";
import crypto from "crypto";
const generateRandomPassword = (length = 10) => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};

export const registerClinicLead = async (data, ipAddress) => {
  const existingLead = await ClinicLead.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
    status: "pending",
  });

  if (existingLead) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Bạn đã gửi yêu cầu hợp tác trước đó và hệ thống đang chờ xử lý.",
    );
  }

  // Upload ảnh nếu có
  let imageUrl = null;
  if (data.file) {
    imageUrl = await uploadToCloudinary(data.file, "clinics_leads");
  }

  const newLead = await ClinicLead.create({
    clinicName: data.clinicName,
    clinicType: data.clinicType,
    address: data.address,
    representativeName: data.representativeName,
    phone: data.phone,
    email: data.email,
    image: imageUrl,
    notes: data.notes,
  });

  logger.info(
    `Có cơ sở y tế mới đăng ký hợp tác: ${newLead.clinicName} (Loại: ${newLead.clinicType})`,
  );

  return {
    message:
      "Gửi yêu cầu hợp tác thành công! Đội ngũ của chúng tôi sẽ liên hệ với bạn trong vòng 24h làm việc.",
    leadId: newLead._id,
  };
};
export const reviewClinicLead = async (
  leadId,
  status,
  reason,
  adminId,
  ipAddress,
  userAgent,
) => {
  const lead = await ClinicLead.findById(leadId);
  if (!lead) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Không tìm thấy hồ sơ đăng ký hợp tác này.",
    );
  }

  if (lead.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Hồ sơ này đã được xử lý (Trạng thái hiện tại: ${lead.status}).`,
    );
  }

  // ================= TÌNH HUỐNG 1: TỪ CHỐI =================
  if (status === "rejected") {
    const html = `<h3>Xin chào ${lead.representativeName},</h3>
                <p>Rất tiếc, hồ sơ đăng ký hợp tác của <strong>${lead.clinicName}</strong> chưa được phê duyệt.</p>
                <p><strong>Lý do:</strong> ${reason}</p>
                <p>Vui lòng bổ sung thông tin và đăng ký lại. Trân trọng!</p>`;

    try {
      await sendEmail(lead.email, "Kết quả đăng ký hợp tác DocGo", html);
    } catch (error) {
      logger.error(`Gửi email từ chối thất bại: ${error.message}`);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Không thể gửi email thông báo từ chối. Vui lòng thử lại.",
      );
    }

    lead.status = "rejected";
    lead.notes = `${lead.notes}\n[Admin từ chối]: ${reason}`;
    await lead.save();

    await AuditLog.create({
      userId: adminId,
      action: "REJECT_CLINIC_LEAD",
      status: "SUCCESS",
      ipAddress,
      userAgent,
      details: { leadId: lead._id, clinicName: lead.clinicName, reason },
    });

    return { message: "Đã từ chối hồ sơ đối tác." };
  }

  // ================= TÌNH HUỐNG 2: PHÊ DUYỆT (CÓ ROLLBACK) =================
  if (status === "resolved") {
    // Tạo PDF trước (không ảnh hưởng DB)
    let pdfBuffer;
    try {
      pdfBuffer = await generateContractPDF(lead);
    } catch (error) {
      logger.error(`Lỗi tạo PDF: ${error.message}`);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Không thể tạo hợp đồng PDF.",
      );
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: lead.email });
    if (existingUser) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Email ${lead.email} đã được sử dụng bởi tài khoản khác.`,
      );
    }

    const plainPassword = generateRandomPassword(10);
    let newUser = null;
    let leadUpdated = false;

    try {
      // Tạo user clinic admin
      newUser = await User.create({
        email: lead.email,
        password: plainPassword,
        fullName: lead.representativeName,
        phone: lead.phone,
        role: "clinic_admin",
        status: "active",
        emailVerified: true,
        requiresPasswordChange: true,
      });

      // Cập nhật lead
      lead.status = "resolved";
      lead.user = newUser._id;
      await lead.save();
      leadUpdated = true;

      // Audit log
      await AuditLog.create({
        userId: adminId,
        action: "APPROVE_CLINIC_LEAD",
        status: "SUCCESS",
        ipAddress,
        userAgent,
        details: {
          leadId: lead._id,
          clinicName: lead.clinicName,
          createdUserId: newUser._id,
        },
      });

      // Gửi email contract
      const contractHtml = `<h3>Chúc mừng ${lead.representativeName}!</h3>
                  <p>Hồ sơ hợp tác của <strong>${lead.clinicName}</strong> đã được phê duyệt.</p>
                  <p>Chúng tôi gửi đính kèm bản Hợp đồng điện tử. Vui lòng in, ký đóng dấu và gửi lại bản cứng cho chúng tôi.</p>
                  <p>Trân trọng,<br/>Đội ngũ DocGo</p>`;

      await sendEmail(
        lead.email,
        "🎉 Chúc mừng! Hợp đồng hợp tác cùng DocGo",
        contractHtml,
        [
          {
            filename: `Hop-dong-hop-tac-${lead.clinicName}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      );

      // Gửi email thông tin đăng nhập
      await sendClinicAdminCredentials(lead.email, plainPassword);

      logger.info(
        `Đã duyệt và tạo tài khoản clinic admin cho: ${lead.clinicName}`,
      );
      return {
        message:
          "Duyệt thành công. Hợp đồng và thông tin đăng nhập đã được gửi qua email.",
      };
    } catch (error) {
      // Rollback: nếu đã tạo user nhưng lead chưa cập nhật, xóa user
      if (newUser && !leadUpdated) {
        await User.deleteOne({ _id: newUser._id }).catch((err) =>
          logger.error(`Lỗi rollback user: ${err.message}`),
        );
      }
      logger.error(`Lỗi duyệt phòng khám ${lead.clinicName}: ${error.message}`);
      throw new ApiError(
        error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
        error.message || "Không thể duyệt hồ sơ. Vui lòng thử lại.",
      );
    }
  }
};

export const getClinicLeads = async (query) => {
  // 1. Khởi tạo ApiFeatures truyền vào Query gốc của Mongoose và Query từ URL
  const features = new ApiFeatures(ClinicLead.find(), query)
    .search() // Tự động search bằng $text
    .filter() // Tự động bắt các field như status=pending, clinicType=hospital...
    .sort() // Tự động sắp xếp (mặc định createdAt -1)
    .paginate(); // Tự động cắt page và limit

  // 2. Chạy query lấy data
  const leads = await features.query;

  // 3. Clone lại filter để đếm tổng số document chính xác (phục vụ phân trang)
  const filterQuery = new ApiFeatures(ClinicLead.find(), query)
    .search()
    .filter().query;
  const total = await ClinicLead.countDocuments(filterQuery.getFilter());

  // 4. Lấy page và limit để tính totalPages
  const page = query.page ? parseInt(query.page) : 1;
  const limit = query.limit ? parseInt(query.limit) : 10;

  return {
    leads,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getPublicClinics = async (query) => {
  // Chỉ lấy các phòng khám đang hoạt động
  const baseFilter = { status: "resolved" };

  const features = new ApiFeatures(ClinicLead.find(baseFilter), query)
    .search()
    .sort()
    .paginate();

  const clinics = await features.query.select("clinicName address logo"); // Chỉ lấy thông tin public
  const total = await ClinicLead.countDocuments(features.query.getFilter());

  return { clinics, total };
};

export const lockClinic = async (
  clinicId,
  reason,
  adminId,
  ipAddress,
  userAgent,
) => {
  const clinic = await ClinicLead.findById(clinicId).populate("user");
  if (!clinic)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy phòng khám.");
  if (clinic.status !== "resolved")
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Chỉ có thể khóa phòng khám đang hoạt động.`,
    );

  // Đồng bộ user
  if (clinic.user) {
    clinic.user.status = "banned";
    await clinic.user.save();
  }

  clinic.status = "locked";
  clinic.lockedReason = reason;
  clinic.lockedAt = new Date();
  clinic.lockedBy = adminId;
  await clinic.save();

  await AuditLog.create({
    userId: adminId,
    action: "LOCK_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      clinicId: clinic._id,
      clinicName: clinic.clinicName,
      reason,
      userId: clinic.user?._id,
    },
  });

  return { message: "Khóa phòng khám thành công." };
};

// ==================== MỞ KHÓA PHÒNG KHÁM ====================
export const unlockClinic = async (clinicId, adminId, ipAddress, userAgent) => {
  const clinic = await ClinicLead.findById(clinicId).populate("user");
  if (!clinic)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy phòng khám.");
  if (clinic.status !== "locked")
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Chỉ có thể mở khóa phòng khám đang bị khóa.`,
    );

  if (clinic.user) {
    clinic.user.status = "active";
    await clinic.user.save();
  }

  clinic.status = "resolved";
  clinic.lockedReason = null;
  clinic.lockedAt = null;
  clinic.lockedBy = null;
  await clinic.save();

  await AuditLog.create({
    userId: adminId,
    action: "UNLOCK_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      clinicId: clinic._id,
      clinicName: clinic.clinicName,
      userId: clinic.user?._id,
    },
  });

  return { message: "Mở khóa phòng khám thành công." };
};

// ==================== XÓA MỀM PHÒNG KHÁM ====================
export const softDeleteClinic = async (
  clinicId,
  reason,
  adminId,
  ipAddress,
  userAgent,
) => {
  const clinic = await ClinicLead.findById(clinicId).populate("user");
  if (!clinic)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy phòng khám.");
  if (clinic.status === "deleted")
    throw new ApiError(StatusCodes.BAD_REQUEST, "Phòng khám đã bị xóa.");

  // Kiểm tra bác sĩ active (giữ nguyên)
  const activeDoctors = await DoctorProfile.countDocuments({
    clinicId: clinic._id,
    status: "active",
  });
  if (activeDoctors > 0)
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Không thể xóa vì còn ${activeDoctors} bác sĩ đang hoạt động.`,
    );

  if (clinic.user) {
    clinic.user.status = "inactive";
    clinic.user.deactivatedAt = new Date();
    await clinic.user.save();
  }

  clinic.status = "deleted";
  clinic.deletedAt = new Date();
  clinic.deletedBy = adminId;
  clinic.deletedReason = reason || null;
  await clinic.save();

  await AuditLog.create({
    userId: adminId,
    action: "SOFT_DELETE_CLINIC",
    status: "SUCCESS",
    ipAddress,
    userAgent,
    details: {
      clinicId: clinic._id,
      clinicName: clinic.clinicName,
      userId: clinic.user?._id,
    },
  });

  return {
    message: "Xóa phòng khám thành công (dữ liệu đã được vô hiệu hóa).",
  };
};

export const getClinicByUserId = async (userId) => {
  const clinic = await ClinicLead.findOne({ user: userId });
  return clinic;
};