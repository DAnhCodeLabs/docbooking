// ============================================================
// backend/src/services/PersonalDataService.js
// ============================================================
import mongoose from "mongoose";
import Appointment from "../../../models/Appointment.js";
import Schedule from "../../../models/Schedule.js";
import Slot from "../../../models/Slot.js";
import MedicalConsultation from "../../../models/MedicalConsultation.js";
import MedicalRecord from "../../../models/MedicalRecord.js";

// ============================================================================
// UTILS: Helper Functions
// ============================================================================

/**
 * Tạo khoảng thời gian [start, end) chuẩn UTC cho một ngày bất kỳ
 */
const getUtcBoundary = (dateInput) => {
  if (!dateInput) return null;
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;

  const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const STATUS_MAP = {
  pending_payment: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  checked_in: "Đã check-in",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

// ============================================================================
// PRIVATE SERVICES
// ============================================================================

const _fetchAppointments = async (userId, filter = {}, options = {}) => {
  const { limit = 10, includeCancelled = true } = options;
  const finalFilter = { patientProfile: userId, ...filter };

  if (!includeCancelled) {
    finalFilter.status = { $ne: "cancelled" };
  }

  const appointments = await Appointment.find(finalFilter)
    .populate({
      path: "doctor",
      select: "fullName",
      populate: {
        path: "doctorProfile",
        select: "specialty consultationFee customClinicName clinicId",
        populate: { path: "clinicId", select: "clinicName address" },
      },
    })
    .populate({
      path: "slot",
      select: "startTime endTime scheduleId",
      populate: { path: "scheduleId", select: "date" },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return appointments.map((app) => {
    const docProfile = app.doctor?.doctorProfile;
    const scheduleDate = app.slot?.scheduleId?.date;

    return {
      id: app._id,
      date: scheduleDate
        ? new Date(scheduleDate).toISOString().split("T")[0]
        : null,
      time:
        app.slot?.startTime && app.slot?.endTime
          ? `${app.slot.startTime} - ${app.slot.endTime}`
          : null,
      doctorName: app.doctor?.fullName || "Bác sĩ (không rõ)",
      doctorId: app.doctor?._id?.toString() || null,
      specialty:
        docProfile?.specialty?.name ||
        docProfile?.specialty?.toString() ||
        null,
      status: app.status,
      statusText: STATUS_MAP[app.status] || app.status,
      clinicName:
        docProfile?.clinicId?.clinicName ||
        docProfile?.customClinicName ||
        "Chưa cập nhật",
      cancellationReason: app.cancellationReason || null,
      paymentStatus: app.paymentStatus || null,
      paymentMethod: app.paymentMethod || null,
    };
  });
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const getUserAppointments = async (userId, options = {}) => {
  return _fetchAppointments(userId, {}, options);
};

export const getUserAppointmentsByDoctor = async (
  userId,
  doctorId,
  options = {},
) => {
  if (!doctorId) return [];
  return _fetchAppointments(userId, { doctor: doctorId }, options);
};

export const getUserAppointmentsByDate = async (userId, date, options = {}) => {
  const boundary = getUtcBoundary(date);
  if (!boundary) return [];

  // 1. Tìm lịch làm việc (Schedules) trong ngày
  const schedules = await mongoose
    .model("Schedule")
    .find({
      date: { $gte: boundary.start, $lt: boundary.end },
    })
    .select("_id")
    .lean();

  if (!schedules.length) return [];

  // 2. Tìm các khung giờ (Slots) thuộc các lịch trên
  const slots = await mongoose
    .model("Slot")
    .find({
      scheduleId: { $in: schedules.map((s) => s._id) },
    })
    .select("_id")
    .lean();

  if (!slots.length) return [];

  // 3. Lấy danh sách cuộc hẹn
  return _fetchAppointments(
    userId,
    { slot: { $in: slots.map((s) => s._id) } },
    options,
  );
};

export const getUserPrescriptions = async (userId, options = {}) => {
  try {
    const filter = { patientId: userId };

    if (options.targetDate) {
      const boundary = getUtcBoundary(options.targetDate);
      if (boundary) {
        filter.createdAt = { $gte: boundary.start, $lt: boundary.end };
      }
    }

    const consultations = await MedicalConsultation.find(filter)
      .populate({
        path: "doctorId",
        select: "fullName",
        populate: {
          path: "doctorProfile",
          select: "specialty consultationFee",
          populate: { path: "specialty", select: "name" },
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return consultations.map((consult) => ({
      id: consult._id,
      date: consult.createdAt,
      doctorName: consult.doctorId?.fullName || "Bác sĩ (không rõ)",
      specialtyName:
        consult.doctorId?.doctorProfile?.specialty?.name || "Chưa cập nhật",
      diagnosis: consult.diagnosis || "Chưa có chẩn đoán",
      prescriptionItems: consult.prescription || [],
      prescriptionText:
        (consult.prescription || [])
          .map(
            (drug) =>
              `• **${drug.drugName}** – ${drug.dosage} – ${drug.instructions}${drug.duration ? ` (${drug.duration})` : ""}`,
          )
          .join("\n     ") || "Không có thuốc",
      instructions: consult.instructions || "",
      followUpDate: consult.followUpDate || null,
    }));
  } catch (error) {
    return [];
  }
};

export const getUserMedicalRecords = async (userId) => {
  try {
    const records = await MedicalRecord.find({ user: userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return records.map((record) => {
      // Ẩn CCCD
      const cccdLen = record.cccd?.length || 0;
      const cccdDisplay =
        cccdLen >= 4
          ? `*${record.cccd.slice(-4)}`
          : record.cccd
            ? "***"
            : "Không có";

      // Ẩn Bảo hiểm
      const provider = record.insurance?.provider;
      const policy = record.insurance?.policyNumber || "";
      let insuranceDisplay = "Không có";

      if (provider) {
        const policySuffix =
          policy.length >= 4 ? `*${policy.slice(-4)}` : policy ? "***" : "";
        insuranceDisplay = `${provider}${policySuffix ? ` (số: ${policySuffix})` : ""}`;
      }

      return {
        id: record._id,
        fullName: record.fullName,
        phone: record.phone || "Chưa cập nhật",
        dateOfBirth: record.dateOfBirth,
        gender:
          record.gender === "male"
            ? "Nam"
            : record.gender === "female"
              ? "Nữ"
              : "Khác",
        cccd: cccdDisplay,
        address: record.address || "Chưa cập nhật",
        bloodGroup: record.bloodGroup || "Chưa rõ",
        allergies: record.allergies?.length
          ? record.allergies.join(", ")
          : "Không có",
        insurance: insuranceDisplay,
        isDefault: record.isDefault || false,
      };
    });
  } catch (error) {
    return [];
  }
};
