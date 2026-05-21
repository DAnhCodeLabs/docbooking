// backend/src/modules/Ai/AdminChat/adminIntentParser.js

// ===============================
// 1. CONSTANTS & CONFIGURATION
// ===============================

// --- Regex patterns (được gom nhóm, loại bỏ redundant) ---
const PATTERNS = {
  // Chuyên khoa: "bác sĩ chuyên khoa tim mạch"
  specialty: /(?:bác sĩ|bs).*(?:thuộc|trong|chuyên khoa|khoa)\s+([a-zà-ỹ\s]+)/i,

  // Phòng khám trong câu hỏi về bác sĩ
  clinicInDoctor:
    /(?:bác sĩ|bs|danh sách).*?(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i,

  // Chi tiết phòng khám
  clinicDetail:
    /(?:chi tiết|thông tin|địa chỉ|số điện thoại).*(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i,

  // Danh sách phòng khám theo trạng thái
  clinicList:
    /(?:danh sách|liệt kê|xem|list).*(?:bệnh viện|phòng khám|cơ sở y tế).*(chưa duyệt|đã duyệt|chờ duyệt|pending|rejected|bị từ chối)/i,

  // Thống kê lịch hẹn (từ khóa chính)
  appointmentStats:
    /(?:thống kê|báo cáo|tổng hợp|xem|số lượng|bao nhiêu).*(?:lịch hẹn|cuộc hẹn|appointment|appointments)/i,

  // Thống kê doanh thu
  revenueStats:
    /(?:thống kê|báo cáo|tổng hợp|xem|số tiền|doanh thu|revenue).*(?:doanh thu|thu nhập|tiền)/i,

  // Thực thể thời gian (chuẩn)
  timeEntity:
    /\b(hôm nay|hôm qua|tuần này|tuần trước|tuần sau|tháng này|tháng trước|tháng sau)\b/i,

  // Dạng thời gian không chuẩn (chỉ để phát hiện, không extract)
  timeFilterLoose:
    /\b(?:hôm nay|hôm qua|tuần này|tuần trước|tuần sau|tháng này|tháng trước|tháng sau|ngày \d{1,2}\/\d{1,2}\/\d{4})\b/i,

  // Trạng thái explicit
  explicitPending: /(chưa duyệt|chờ duyệt|pending|chưa được duyệt)/i,
  explicitApproved: /(đã duyệt|được duyệt|approved|active)/i,

  // Đếm bác sĩ (pending / approved)
  pendingDoctor:
    /bác sĩ.*(chưa duyệt|chờ duyệt|pending|chưa được duyệt)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*(chưa|chờ)/i,
  approvedDoctor:
    /bác sĩ.*(đã duyệt|được duyệt|approved|active)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*đã duyệt/i,

  // Yêu cầu chi tiết (dùng trong ambiguous)
  requireDetail:
    /(liệt kê|danh sách cụ thể|chi tiết|tên|list|show me|bệnh viện|phòng khám|khoa|chuyên khoa|bs\s+\w+)/i,
};

// Map chuyển đổi time entity sang internal key
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

// Map trạng thái cho danh sách phòng khám
const CLINIC_STATUS_MAP = {
  "chưa duyệt": ["pending"],
  "chờ duyệt": ["pending"],
  pending: ["pending"],
  "đã duyệt": ["resolved", "contacted"],
  rejected: ["rejected"],
  "bị từ chối": ["rejected"],
};

// Stop words loại bỏ khỏi tên (chuyên khoa / phòng khám)
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
// 2. HELPER FUNCTIONS (DRY & CLEAN)
// ===============================

/**
 * Loại bỏ stop words khỏi tên (chuyên khoa / phòng khám)
 */
const cleanName = (rawName) => {
  if (!rawName) return "";
  let cleaned = rawName.trim();
  for (const sw of STOP_WORDS) {
    if (cleaned.endsWith(sw)) {
      cleaned = cleaned.slice(0, -sw.length).trim();
    }
  }
  return cleaned;
};

/**
 * Lấy trạng thái explicit từ message (pending / approved / null)
 */
const getExplicitStatus = (msg) => {
  if (PATTERNS.explicitPending.test(msg)) return "pending";
  if (PATTERNS.explicitApproved.test(msg)) return "approved";
  return null;
};

/**
 * Trích xuất timeRange từ message nếu có, trả về { timeRange, ambiguous }
 */
const extractTimeRange = (msg) => {
  const match = msg.match(PATTERNS.timeEntity);
  if (!match) return { timeRange: null, ambiguous: false };

  const entity = match[1].toLowerCase();
  // Trường hợp đặc biệt: "tuần" nhưng không có "này/trước/sau"
  if (entity === "tuần" && !/\b(tuần này|tuần trước|tuần sau)\b/i.test(msg)) {
    return { timeRange: null, ambiguous: true };
  }
  return { timeRange: TIME_RANGE_MAP[entity] || null, ambiguous: false };
};

/**
 * Xử lý tên chuyên khoa / phòng khám từ regex match
 */
const extractNameFromMatch = (match, groupIndex = 1) => {
  if (!match || !match[groupIndex]) return null;
  return cleanName(match[groupIndex]);
};

// ===============================
// 3. MAIN PARSER FUNCTION
// ===============================

export const parseAdminQuery = (message, inheritedStatus = null) => {
  // Edge cases
  if (!message || typeof message !== "string") {
    return { intent: "unknown", requiresClarification: false };
  }
  const lowerMsg = message.toLowerCase().trim();
  console.log(`[DEBUG][Parser] Raw message: "${message}"`);
  console.log(`[DEBUG][Parser] Lowercase: "${lowerMsg}"`);
  const explicitStatus = getExplicitStatus(lowerMsg);
  const finalStatus = explicitStatus || inheritedStatus || null;

  // ----- 1. Chi tiết phòng khám (ưu tiên cao nhất) -----
  const clinicDetailMatch = lowerMsg.match(PATTERNS.clinicDetail);
  if (clinicDetailMatch) {
    const clinicName = extractNameFromMatch(clinicDetailMatch);
    if (clinicName && clinicName.length >= 2) {
      return {
        intent: "get_clinic_details",
        clinicName,
        requiresClarification: false,
        statusFilter: null,
      };
    }
  }

  const clinicRevenueMonthRegex =
    /(?:thống kê|doanh thu|thu nhập)(?:.*?(?:của|từ))?\s*(?:bệnh viện|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+?)\s+(?:tháng\s+(\d{1,2})(?:\s*[/-]\s*(\d{4})|(?:\s+năm\s+(\d{4})))?)/i;
  const monthMatch = lowerMsg.match(clinicRevenueMonthRegex);
  if (monthMatch) {
    const clinicName = cleanName(monthMatch[1]);
    let month = monthMatch[2] ? parseInt(monthMatch[2], 10) : null;
    let year = monthMatch[3]
      ? parseInt(monthMatch[3], 10)
      : monthMatch[4]
        ? parseInt(monthMatch[4], 10)
        : null;

    // Xử lý "tháng này" đã bắt trước đó? Thực tế "tháng này" không match regex do không có số, để fallback cho "tháng này/trước/sau" qua timeEntity
    if (month && year) {
      if (month < 1 || month > 12) {
        console.log(
          `[DEBUG][Parser] Intent "clinic_revenue_by_month" detected. clinicName="${clinicName}", month=${month}, year=${year}`,
        );
        return {
          intent: "clinic_revenue_by_month",
          requiresClarification: true,
          clarificationMessage:
            "⚠️ Tháng không hợp lệ (phải từ 1 đến 12). Anh/chị vui lòng nhập lại tháng cụ thể (VD: tháng 3/2026).",
          statusFilter: null,
        };
      }
      return {
        intent: "clinic_revenue_by_month",
        clinicName,
        month,
        year,
        requiresClarification: false,
        statusFilter: null,
      };
    }
  }

  // ----- 1c. Xử lý "tháng này", "tháng trước", "tháng sau" + phòng khám -----
  const clinicRevenueRelativeRegex =
    /(?:thống kê|doanh thu).*(?:của|từ).*(?:bệnh viện|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+).*(tháng này|tháng trước|tháng sau)/i;
  const relativeMatch = lowerMsg.match(clinicRevenueRelativeRegex);
  if (relativeMatch) {
    const clinicName = cleanName(relativeMatch[1]);
    const relativeKeyword = relativeMatch[2].toLowerCase();
    let monthOffset = 0;
    if (relativeKeyword === "tháng trước") monthOffset = -1;
    if (relativeKeyword === "tháng sau") monthOffset = 1;
    console.log(
      `[DEBUG][Parser] Intent "clinic_revenue_by_month" relative. clinicName="${clinicName}", monthOffset=${monthOffset}`,
    );
    return {
      intent: "clinic_revenue_by_month",
      clinicName,
      monthOffset,
      requiresClarification: false,
      statusFilter: null,
    };
  }

  // ----- 2. Danh sách phòng khám theo trạng thái -----
  const clinicListMatch = lowerMsg.match(PATTERNS.clinicList);
  if (clinicListMatch) {
    const statusKeyword = clinicListMatch[1].toLowerCase();
    const statuses = CLINIC_STATUS_MAP[statusKeyword];
    if (statuses) {
      return {
        intent: "list_clinics_by_approval_status",
        statuses,
        statusLabel: statusKeyword,
        requiresClarification: false,
        statusFilter: null,
      };
    }
  }

  // ----- 3. Thống kê lịch hẹn -----
  if (PATTERNS.appointmentStats.test(lowerMsg)) {
    const { timeRange, ambiguous } = extractTimeRange(lowerMsg);
    if (ambiguous) {
      return {
        intent: "appointment_stats_by_time",
        requiresClarification: true,
        clarificationMessage:
          "Anh/chị muốn xem lịch hẹn của **tuần này**, **tuần trước** hay **tuần sau** ạ?",
        statusFilter: null,
      };
    }
    if (timeRange) {
      return {
        intent: "appointment_stats_by_time",
        timeRange,
        requiresClarification: false,
        statusFilter: null,
      };
    }
    // Có từ khóa thống kê nhưng không có timeRange cụ thể
    if (PATTERNS.timeFilterLoose.test(lowerMsg)) {
      return {
        intent: "total_appointment_stats",
        requiresClarification: true,
        clarificationMessage:
          "Em hiện chỉ hỗ trợ thống kê toàn bộ hệ thống (không lọc theo thời gian). Anh/chị có muốn xem tổng thể không ạ?",
        statusFilter: null,
      };
    }
    return {
      intent: "total_appointment_stats",
      requiresClarification: false,
      statusFilter: null,
    };
  }

  // ----- 4. Thống kê doanh thu (có / không thời gian) -----
  if (PATTERNS.revenueStats.test(lowerMsg)) {
    const { timeRange, ambiguous } = extractTimeRange(lowerMsg);
    if (ambiguous) {
      return {
        intent: "revenue_stats_by_time",
        requiresClarification: true,
        clarificationMessage:
          "Anh/chị muốn xem doanh thu của **tuần này**, **tuần trước** hay **tuần sau** ạ?",
        statusFilter: null,
      };
    }
    if (timeRange) {
      return {
        intent: "revenue_stats_by_time",
        timeRange,
        requiresClarification: false,
        statusFilter: null,
      };
    }
    // Không có thời gian -> total revenue (nhưng kiểm tra nếu có timeFilter linh tinh thì hỏi lại)
    if (PATTERNS.timeFilterLoose.test(lowerMsg)) {
      return {
        intent: "total_revenue_stats",
        requiresClarification: true,
        clarificationMessage:
          "Em hiện chỉ hỗ trợ thống kê tổng doanh thu toàn hệ thống (không lọc theo thời gian). Anh/chị có muốn xem tổng thể không ạ?",
        statusFilter: null,
      };
    }
    return {
      intent: "total_revenue_stats",
      requiresClarification: false,
      statusFilter: null,
    };
  }

  // ----- 5. Danh sách bác sĩ theo phòng khám -----
  const clinicMatch = lowerMsg.match(PATTERNS.clinicInDoctor);
  if (clinicMatch) {
    const clinicName = extractNameFromMatch(clinicMatch);
    if (clinicName && clinicName.length >= 2) {
      return {
        intent: "list_doctors_by_clinic",
        clinicName,
        statusFilter: finalStatus,
        requiresClarification: false,
      };
    }
  }

  // ----- 6. Danh sách bác sĩ theo chuyên khoa -----
  const specialtyMatch = lowerMsg.match(PATTERNS.specialty);
  if (specialtyMatch) {
    const specialtyName = extractNameFromMatch(specialtyMatch);
    if (specialtyName && specialtyName.length >= 2) {
      return {
        intent: "list_doctors_by_specialty",
        specialtyName,
        statusFilter: finalStatus,
        requiresClarification: false,
      };
    }
  }

  // ----- 7. Đếm số lượng bác sĩ theo trạng thái -----
  const isPending = PATTERNS.pendingDoctor.test(lowerMsg);
  const isApproved = !isPending && PATTERNS.approvedDoctor.test(lowerMsg);
  if (isPending || isApproved) {
    const statusType = isPending ? "pending" : "approved";
    const requiresDetail = PATTERNS.requireDetail.test(lowerMsg);
    return {
      intent: "count_doctors_by_approval_status",
      statusType,
      statusFilter: statusType,
      requiresClarification: requiresDetail,
      clarificationMessage: requiresDetail
        ? "Em chỉ có thể thống kê số lượng bác sĩ đã duyệt/chưa duyệt trên toàn hệ thống. Nếu cần xem danh sách chi tiết hoặc lọc theo bệnh viện/chuyên khoa, vui lòng đặt câu hỏi riêng ạ."
        : undefined,
    };
  }

  // ----- 8. Mơ hồ về bác sĩ -----
  if (/bác sĩ|bs/i.test(lowerMsg)) {
    return {
      intent: "ambiguous_doctor_status",
      requiresClarification: true,
      clarificationMessage:
        "Anh/chị muốn xem số lượng bác sĩ **đã duyệt** hay **chưa duyệt** ạ?",
      statusFilter: null,
    };
  }

  // ----- 9. Mặc định -----
  return {
    intent: "unknown",
    requiresClarification: false,
    statusFilter: null,
  };
};
