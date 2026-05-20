// ============================================================
// backend/src/services/PersonalDataService.js
// ============================================================
import mongoose from "mongoose";
import Appointment from "../../../models/Appointment.js";
import Slot from "../../../models/Slot.js";
import Schedule from "../../../models/Schedule.js";
import User from "../../../models/User.js";
import DoctorProfile from "../../../models/DoctorProfile.js";
import ClinicLead from "../../../models/ClinicLead.js";
import MedicalConsultation from "../../../models/MedicalConsultation.js";

/**
 * Private: Lấy và format appointments theo filter
 * @param {ObjectId} userId
 * @param {Object} filter - Điều kiện MongoDB bổ sung (ví dụ: { slot: { $in: [...] } })
 * @param {Object} options - { limit, includeCancelled }
 * @returns {Promise<Array>} - Mảng các object đã format
 */
const _fetchAppointments = async (userId, filter = {}, options = {}) => {
  const { limit = 10, includeCancelled = true } = options;

  const baseFilter = { patientProfile: userId };
  if (!includeCancelled) {
    baseFilter.status = { $ne: "cancelled" };
  }
  const finalFilter = { ...baseFilter, ...filter };
  console.log(
    `[DEBUG _fetchAppointments] finalFilter:`,
    JSON.stringify(finalFilter, null, 2),
  );

  const appointments = await Appointment.find(finalFilter)
    .populate({
      path: "doctor",
      select: "fullName",
      populate: {
        path: "doctorProfile",
        select: "specialty consultationFee customClinicName clinicId",
        populate: {
          path: "clinicId",
          select: "clinicName address",
        },
      },
    })
    .populate({
      path: "slot",
      select: "startTime endTime scheduleId",
      populate: {
        path: "scheduleId",
        select: "date",
      },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  console.log(
    `[DEBUG _fetchAppointments] Raw appointments count: ${appointments.length}`,
  );

  // Format kết quả
  const formatted = appointments.map((app) => {
    const doctor = app.doctor || {};
    const doctorProfile = doctor.doctorProfile || {};

    // Lấy chuyên khoa
    let specialtyName = null;
    if (doctorProfile.specialty) {
      specialtyName =
        doctorProfile.specialty.name || doctorProfile.specialty.toString();
    }

    // Lấy tên phòng khám
    let clinicName = null;
    if (doctorProfile.clinicId && doctorProfile.clinicId.clinicName) {
      clinicName = doctorProfile.clinicId.clinicName;
    } else if (doctorProfile.customClinicName) {
      clinicName = doctorProfile.customClinicName;
    }

    // Lấy ngày và giờ từ slot và schedule
    let dateStr = null;
    let timeStr = null;
    if (app.slot) {
      const schedule = app.slot.scheduleId;
      if (schedule && schedule.date) {
        dateStr = new Date(schedule.date).toISOString().split("T")[0];
      }
      if (app.slot.startTime && app.slot.endTime) {
        timeStr = `${app.slot.startTime} - ${app.slot.endTime}`;
      }
    }

    // Bản đồ trạng thái
    const statusMap = {
      pending_payment: "Chờ thanh toán",
      confirmed: "Đã xác nhận",
      checked_in: "Đã check-in",
      completed: "Đã hoàn thành",
      cancelled: "Đã hủy",
    };
    const statusText = statusMap[app.status] || app.status;

    return {
      id: app._id,
      date: dateStr,
      time: timeStr,
      doctorName: doctor.fullName || "Bác sĩ (không rõ)",
      doctorId: doctor._id ? doctor._id.toString() : null,
      specialty: specialtyName,
      status: app.status,
      statusText,
      clinicName: clinicName || "Chưa cập nhật",
      cancellationReason: app.cancellationReason || null,
    };
  });

  console.log(
    `[DEBUG _fetchAppointments] Formatted appointments count: ${formatted.length}`,
  );
  return formatted;
};

// ================== PUBLIC API ==================

/**
 * Lấy danh sách lịch hẹn của bệnh nhân (tất cả)
 * @param {string|ObjectId} userId
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export const getUserAppointments = async (userId, options = {}) => {
  console.log(`[DEBUG getUserAppointments] userId=${userId}`);
  return _fetchAppointments(userId, {}, options);
};

/**
 * Lấy danh sách lịch hẹn của bệnh nhân theo bác sĩ
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} doctorId
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export const getUserAppointmentsByDoctor = async (
  userId,
  doctorId,
  options = {},
) => {
  console.log(
    `[DEBUG getUserAppointmentsByDoctor] userId=${userId}, doctorId=${doctorId}`,
  );
  if (!doctorId) return [];
  return _fetchAppointments(userId, { doctor: doctorId }, options);
};

/**
 * Lấy danh sách lịch hẹn của bệnh nhân theo ngày (dựa trên schedule.date)
 * @param {string|ObjectId} userId
 * @param {Date|string} date - Date object hoặc string YYYY-MM-DD (sẽ chuyển về UTC)
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export const getUserAppointmentsByDate = async (userId, date, options = {}) => {
  console.log(
    `[DEBUG getUserAppointmentsByDate] userId=${userId}, date=${date}`,
  );
  if (!date) {
    console.log(`[DEBUG] date is falsy, returning []`);
    return [];
  }

  // Chuyển đổi date thành Date object UTC 00:00:00
  let targetDate;
  if (typeof date === "string") {
    targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      console.log(`[DEBUG] Invalid date string, returning []`);
      return [];
    }
    targetDate = new Date(
      Date.UTC(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
      ),
    );
  } else if (date instanceof Date) {
    targetDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  } else {
    console.log(`[DEBUG] date is not string or Date, returning []`);
    return [];
  }

  const start = targetDate;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  console.log(`[DEBUG] start=${start.toISOString()}, end=${end.toISOString()}`);

  // Bước 1: Lấy tất cả Schedule có date trong [start, end)
  const ScheduleModel = mongoose.model("Schedule");
  const schedules = await ScheduleModel.find({
    date: { $gte: start, $lt: end },
  })
    .select("_id")
    .lean();
  console.log(`[DEBUG] Found ${schedules.length} schedules`);

  if (!schedules.length) return [];
  const scheduleIds = schedules.map((s) => s._id);

  // Bước 2: Lấy tất cả Slot thuộc các schedule đó
  const SlotModel = mongoose.model("Slot");
  const slots = await SlotModel.find({
    scheduleId: { $in: scheduleIds },
  })
    .select("_id")
    .lean();
  console.log(`[DEBUG] Found ${slots.length} slots`);

  if (!slots.length) return [];
  const slotIds = slots.map((s) => s._id);

  // Bước 3: Lấy Appointment với patientProfile và slot nằm trong slotIds
  const filter = { slot: { $in: slotIds } };
  const result = await _fetchAppointments(userId, filter, options);
  console.log(`[DEBUG] Final appointments count: ${result.length}`);
  return result;
};


/**
 * Lấy danh sách đơn thuốc của bệnh nhân (có thể lọc theo ngày)
 * @param {string|ObjectId} userId
 * @param {Object} options - { targetDate (string YYYY-MM-DD) }
 * @returns {Promise<Array>}
 */
export const getUserPrescriptions = async (userId, options = {}) => {
  console.log(`[DEBUG getUserPrescriptions] userId=${userId}, options=`, options);
  try {
    let filter = { patientId: userId };
    if (options.targetDate) {
      const start = parseDateToUTC(options.targetDate);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
      console.log(`[DEBUG] Filter by date range: ${start.toISOString()} - ${end.toISOString()}`);
    }

    const consultations = await MedicalConsultation.find(filter)
      .populate({
        path: 'doctorId',
        select: 'fullName',
        populate: {
          path: 'doctorProfile',
          select: 'specialty consultationFee',
          populate: { path: 'specialty', select: 'name' }
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[DEBUG getUserPrescriptions] Found ${consultations.length} consultations`);
    const formatted = consultations.map((consult) => {
      const doctor = consult.doctorId || {};
      const doctorProfile = doctor.doctorProfile || {};
      const specialtyName = doctorProfile.specialty?.name || 'Chưa cập nhật';
      const prescriptionText = (consult.prescription || []).map((drug) =>
        `• **${drug.drugName}** – ${drug.dosage} – ${drug.instructions}${drug.duration ? ` (${drug.duration})` : ''}`
      ).join('\n     ');
      return {
        id: consult._id,
        date: consult.createdAt,
        doctorName: doctor.fullName || 'Bác sĩ (không rõ)',
        specialtyName,
        diagnosis: consult.diagnosis || 'Chưa có chẩn đoán',
        prescriptionItems: consult.prescription || [],
        prescriptionText: prescriptionText || 'Không có thuốc',
        instructions: consult.instructions || '',
        followUpDate: consult.followUpDate || null
      };
    });
    return formatted;
  } catch (error) {
    console.error(`[getUserPrescriptions] DB error: ${error.message}`);
    return [];
  }
};