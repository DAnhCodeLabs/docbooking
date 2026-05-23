// backend/src/modules/Ai/AdminChat/adminIntentParser.js

// ===============================
// 1. CONSTANTS & CONFIGURATION
// ===============================

const PATTERNS = {
  specialty: /(?:bác sĩ|bs).*(?:thuộc|trong|chuyên khoa|khoa)\s+([a-zà-ỹ\s]+)/i,
  clinicInDoctor:
    /(?:bác sĩ|bs|danh sách).*?(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i,
  clinicDetail:
    /(?:chi tiết|thông tin|địa chỉ|số điện thoại).*(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i,
  clinicList:
    /(?:danh sách|liệt kê|xem|list).*(?:bệnh viện|phòng khám|cơ sở y tế).*(chưa duyệt|đã duyệt|chờ duyệt|pending|rejected|bị từ chối)/i,
  clinicRevenueMonth:
    /(?:thống kê|doanh thu|thu nhập)(?:.*?(?:của|từ))?\s*(?:bệnh viện|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+?)\s+(?:tháng\s+(\d{1,2})(?:\s*[/-]\s*(\d{4})|(?:\s+năm\s+(\d{4})))?)/i,
  clinicRevenueRelative:
    /(?:thống kê|doanh thu).*(?:của|từ).*(?:bệnh viện|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+).*(tháng này|tháng trước|tháng sau)/i,
  appointmentStats:
    /(?:thống kê|báo cáo|tổng hợp|xem|số lượng|bao nhiêu).*(?:lịch hẹn|cuộc hẹn|appointment|appointments)/i,
  revenueStats:
    /(?:thống kê|báo cáo|tổng hợp|xem|số tiền|doanh thu|revenue).*(?:doanh thu|thu nhập|tiền)/i,
  timeEntity:
    /\b(hôm nay|hôm qua|tuần này|tuần trước|tuần sau|tháng này|tháng trước|tháng sau)\b/i,
  timeFilterLoose:
    /\b(?:hôm nay|hôm qua|tuần này|tuần trước|tuần sau|tháng này|tháng trước|tháng sau|ngày \d{1,2}\/\d{1,2}\/\d{4})\b/i,
  explicitPending: /(chưa duyệt|chờ duyệt|pending|chưa được duyệt)/i,
  explicitApproved: /(đã duyệt|được duyệt|approved|active)/i,
  pendingDoctor:
    /bác sĩ.*(chưa duyệt|chờ duyệt|pending|chưa được duyệt)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*(chưa|chờ)/i,
  approvedDoctor:
    /bác sĩ.*(đã duyệt|được duyệt|approved|active)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*đã duyệt/i,
  requireDetail:
    /(liệt kê|danh sách cụ thể|chi tiết|tên|list|show me|bệnh viện|phòng khám|khoa|chuyên khoa|bs\s+\w+)/i,
  ambiguousDoctor: /bác sĩ|bs/i,
  topDoctorCompleted:
    /(?:top|danh sách|những|xếp hạng|liệt kê|xem|tìm|cho xem).*(?:bác sĩ|bs).*(?:lịch hẹn|cuộc hẹn|khám|ca khám).*(?:nhiều nhất|cao nhất).*(?:hoàn thành|xong)/i,
};

const TIME_RANGE_MAP = {
  "hôm nay": "today",
  "hôm qua": "yesterday",
  "tuần này": "this_week",
  "tuần trước": "last_week",
  "tuần sau": "next_week",
  "tháng này": "this_month",
  "tháng trước": "last_month",
  "tháng sau": "next_month",
};

const CLINIC_STATUS_MAP = {
  "chưa duyệt": ["pending"],
  "chờ duyệt": ["pending"],
  pending: ["pending"],
  "đã duyệt": ["resolved", "contacted"],
  rejected: ["rejected"],
  "bị từ chối": ["rejected"],
};

const STOP_WORDS = [
  "ở",
  "tại",
  "quận",
  "huyện",
  "tp",
  "thành phố",
  "phường",
  "xã",
  ",",
  ".",
];

// ===============================
// 2. HELPERS (KISS & DRY)
// ===============================

const cleanName = (rawName) => {
  if (!rawName) return "";
  let cleaned = rawName.trim();
  for (const sw of STOP_WORDS) {
    if (cleaned.endsWith(sw)) cleaned = cleaned.slice(0, -sw.length).trim();
  }
  return cleaned;
};

const extractNameFromMatch = (match, groupIndex = 1) =>
  match?.[groupIndex] ? cleanName(match[groupIndex]) : null;

const getExplicitStatus = (msg) =>
  PATTERNS.explicitPending.test(msg)
    ? "pending"
    : PATTERNS.explicitApproved.test(msg)
      ? "approved"
      : null;

const extractTimeRange = (msg) => {
  const match = msg.match(PATTERNS.timeEntity);
  if (!match) return { timeRange: null, ambiguous: false };
  const entity = match[1].toLowerCase();
  if (entity === "tuần" && !/\b(tuần này|tuần trước|tuần sau)\b/i.test(msg))
    return { timeRange: null, ambiguous: true };
  return { timeRange: TIME_RANGE_MAP[entity] || null, ambiguous: false };
};

// Chuẩn hóa Output trả về để triệt tiêu mã lặp lồng nhau
const result = (intent, extraData = {}) => ({
  intent,
  requiresClarification: false,
  statusFilter: null,
  ...extraData,
});

const clarify = (intent, message) => ({
  intent,
  requiresClarification: true,
  clarificationMessage: message,
  statusFilter: null,
});

// ===============================
// 3. MAIN PARSER FUNCTION
// ===============================

export const parseAdminQuery = (message, inheritedStatus = null) => {
  if (!message || typeof message !== "string") return result("unknown");

  const lowerMsg = message.toLowerCase().trim();
  console.log(`[DEBUG][Parser] Raw: "${message}" | Lower: "${lowerMsg}"`);

  const finalStatus = getExplicitStatus(lowerMsg) || inheritedStatus || null;

  // [HOTFIX]: ƯU TIÊN 0 - Xếp hạng Top Bác sĩ (Rule chi tiết nhất phải đứng đầu)
  if (PATTERNS.topDoctorCompleted.test(lowerMsg)) {
    console.log(
      `[DEBUG][TopDoctors][Parser] Trúng Regex 'topDoctorCompleted'. Intent: top_doctors_completed_appointments`,
    );
    return result("top_doctors_completed_appointments");
  }

  // 1. Chi tiết phòng khám
  const clinicDetailName = extractNameFromMatch(
    lowerMsg.match(PATTERNS.clinicDetail),
  );
  if (clinicDetailName?.length >= 2)
    return result("get_clinic_details", { clinicName: clinicDetailName });

  // 1b. Doanh thu phòng khám theo tháng cụ thể
  const monthMatch = lowerMsg.match(PATTERNS.clinicRevenueMonth);
  if (monthMatch) {
    const clinicName = cleanName(monthMatch[1]);
    const month = monthMatch[2] ? parseInt(monthMatch[2], 10) : null;
    const year = monthMatch[3]
      ? parseInt(monthMatch[3], 10)
      : monthMatch[4]
        ? parseInt(monthMatch[4], 10)
        : null;

    if (month && year) {
      if (month < 1 || month > 12) {
        return clarify(
          "clinic_revenue_by_month",
          "⚠️ Tháng không hợp lệ (phải từ 1 đến 12). Anh/chị vui lòng nhập lại tháng cụ thể (VD: tháng 3/2026).",
        );
      }
      return result("clinic_revenue_by_month", { clinicName, month, year });
    }
  }

  // 1c. Doanh thu phòng khám theo tháng tương đối
  const relativeMatch = lowerMsg.match(PATTERNS.clinicRevenueRelative);
  if (relativeMatch) {
    const clinicName = cleanName(relativeMatch[1]);
    const kw = relativeMatch[2];
    const monthOffset = kw === "tháng trước" ? -1 : kw === "tháng sau" ? 1 : 0;
    return result("clinic_revenue_by_month", { clinicName, monthOffset });
  }

  // 2. Danh sách phòng khám theo trạng thái
  const clinicListMatch = lowerMsg.match(PATTERNS.clinicList);
  if (clinicListMatch) {
    const statusLabel = clinicListMatch[1];
    const statuses = CLINIC_STATUS_MAP[statusLabel];
    if (statuses)
      return result("list_clinics_by_approval_status", {
        statuses,
        statusLabel,
      });
  }

  // 3. Thống kê lịch hẹn
  if (PATTERNS.appointmentStats.test(lowerMsg)) {
    const { timeRange, ambiguous } = extractTimeRange(lowerMsg);
    if (ambiguous)
      return clarify(
        "appointment_stats_by_time",
        "Anh/chị muốn xem lịch hẹn của **tuần này**, **tuần trước** hay **tuần sau** ạ?",
      );
    if (timeRange) return result("appointment_stats_by_time", { timeRange });
    if (PATTERNS.timeFilterLoose.test(lowerMsg))
      return clarify(
        "total_appointment_stats",
        "Em hiện chỉ hỗ trợ thống kê toàn bộ hệ thống (không lọc theo thời gian). Anh/chị có muốn xem tổng thể không ạ?",
      );
    return result("total_appointment_stats");
  }

  // 4. Thống kê doanh thu
  if (PATTERNS.revenueStats.test(lowerMsg)) {
    console.log(
      `[DEBUG][RevenueStats][Parser] Phát hiện câu hỏi liên quan đến doanh thu.`,
    );
    const { timeRange, ambiguous } = extractTimeRange(lowerMsg);

    if (ambiguous) {
      console.log(
        `[DEBUG][RevenueStats][Parser] Thời gian mơ hồ -> Yêu cầu làm rõ (Clarify).`,
      );
      return clarify(
        "revenue_stats_by_time",
        "Anh/chị muốn xem doanh thu của **tuần này**, **tuần trước** hay **tuần sau** ạ?",
      );
    }

    if (timeRange) {
      console.log(
        `[DEBUG][RevenueStats][Parser] Chốt Intent: revenue_stats_by_time. Khoảng thời gian: ${timeRange}`,
      );
      return result("revenue_stats_by_time", { timeRange });
    }

    if (PATTERNS.timeFilterLoose.test(lowerMsg)) {
      console.log(
        `[DEBUG][RevenueStats][Parser] Thời gian lỏng lẻo -> Yêu cầu làm rõ (Clarify total).`,
      );
      return clarify(
        "total_revenue_stats",
        "Em hiện chỉ hỗ trợ thống kê tổng doanh thu toàn hệ thống (không lọc theo thời gian). Anh/chị có muốn xem tổng thể không ạ?",
      );
    }

    console.log(
      `[DEBUG][RevenueStats][Parser] Chốt Intent: total_revenue_stats (Toàn hệ thống).`,
    );
    return result("total_revenue_stats");
  }

  // 5. Danh sách bác sĩ theo phòng khám
  const doctorClinicName = extractNameFromMatch(
    lowerMsg.match(PATTERNS.clinicInDoctor),
  );
  if (doctorClinicName?.length >= 2)
    return result("list_doctors_by_clinic", {
      clinicName: doctorClinicName,
      statusFilter: finalStatus,
    });

  // 6. Danh sách bác sĩ theo chuyên khoa
  const specialtyName = extractNameFromMatch(
    lowerMsg.match(PATTERNS.specialty),
  );
  if (specialtyName?.length >= 2)
    return result("list_doctors_by_specialty", {
      specialtyName,
      statusFilter: finalStatus,
    });

  // 7. Đếm số lượng bác sĩ theo trạng thái
  const isPending = PATTERNS.pendingDoctor.test(lowerMsg);
  const isApproved = !isPending && PATTERNS.approvedDoctor.test(lowerMsg);
  if (isPending || isApproved) {
    const statusType = isPending ? "pending" : "approved";
    const requiresDetail = PATTERNS.requireDetail.test(lowerMsg);
    return result("count_doctors_by_approval_status", {
      statusType,
      statusFilter: statusType,
      requiresClarification: requiresDetail,
      ...(requiresDetail && {
        clarificationMessage:
          "Em chỉ có thể thống kê số lượng bác sĩ đã duyệt/chưa duyệt trên toàn hệ thống. Nếu cần xem danh sách chi tiết hoặc lọc theo bệnh viện/chuyên khoa, vui lòng đặt câu hỏi riêng ạ.",
      }),
    });
  }

  // 8. Mơ hồ về bác sĩ
  if (PATTERNS.ambiguousDoctor.test(lowerMsg)) {
    return clarify(
      "ambiguous_doctor_status",
      "Anh/chị muốn xem số lượng bác sĩ **đã duyệt** hay **chưa duyệt** ạ?",
    );
  }

  // 9. Mặc định
  return result("unknown");
};;;;
