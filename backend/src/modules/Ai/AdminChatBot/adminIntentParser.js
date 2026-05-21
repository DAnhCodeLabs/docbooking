// backend/src/modules/Ai/AdminChat/adminIntentParser.js

// ==================== GIỮ NGUYÊN CÁC REGEX CŨ ====================
const SPECIALTY_REGEX =
  /(?:bác sĩ|bs).*(?:thuộc|trong|chuyên khoa|khoa)\s+([a-zà-ỹ\s]+)/i;
const STOP_WORDS_REGEX = /\s*(nào|đó|ấy|hả|ạ)$/i;

const PENDING_REGEX =
  /bác sĩ.*(chưa duyệt|chờ duyệt|pending|chưa được duyệt)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*(chưa|chờ)/i;
const APPROVED_REGEX =
  /bác sĩ.*(đã duyệt|được duyệt|approved|active)|(danh sách|bao nhiêu|số lượng|thống kê).*bác sĩ.*đã duyệt/i;
const REQUIRE_DETAIL_REGEX =
  /(liệt kê|danh sách cụ thể|chi tiết|tên|list|show me|bệnh viện|phòng khám|khoa|chuyên khoa|bs\s+\w+)/i;

const EXPLICIT_PENDING_REGEX =
  /(chưa duyệt|chờ duyệt|pending|chưa được duyệt)/i;
const EXPLICIT_APPROVED_REGEX = /(đã duyệt|được duyệt|approved|active)/i;

// Regex cũ cho clinic có tên cụ thể (dùng cho list_doctors_by_clinic)
const CLINIC_REGEX =
  /(?:bác sĩ|bs|danh sách).*?(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i;

// ==================== [NEW] REGEX MỚI ====================
// Regex cho chi tiết bệnh viện (ưu tiên cao nhất)
const CLINIC_DETAIL_REGEX =
  /(?:chi tiết|thông tin|địa chỉ|số điện thoại).*(?:bệnh viện|bv|phòng khám|cơ sở)\s+([a-zà-ỹ0-9\s]+)$/i;

// Regex cho danh sách bệnh viện theo trạng thái
const CLINIC_LIST_REGEX =
  /(?:danh sách|liệt kê|xem|list).*(?:bệnh viện|phòng khám|cơ sở y tế).*(chưa duyệt|đã duyệt|chờ duyệt|pending|rejected|bị từ chối)/i;

// Map từ khóa trạng thái -> mảng status trong DB
const statusKeywordMap = {
  "chưa duyệt": ["pending"],
  "chờ duyệt": ["pending"],
  pending: ["pending"],
  "đã duyệt": ["resolved", "contacted"],
  rejected: ["rejected"],
  "bị từ chối": ["rejected"],
};

// ==================== HÀM PARSE CHÍNH ====================
export const parseAdminQuery = (message, prevState = null) => {
  console.log("[DEBUG][parseAdminQuery] Input:", message);
  if (!message || typeof message !== "string") {
    return { intent: "unknown", requiresClarification: false };
  }

  const lowerMsg = message.toLowerCase().trim();
  console.log("[DEBUG][parseAdminQuery] lowerMsg:", lowerMsg);

  // [NEW] 1. Ưu tiên cao nhất: kiểm tra intent chi tiết bệnh viện
  const clinicDetailMatch = lowerMsg.match(CLINIC_DETAIL_REGEX);
  if (clinicDetailMatch && clinicDetailMatch[1]) {
    let clinicName = clinicDetailMatch[1].trim();
    const stopWords = [
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
    for (const sw of stopWords) {
      if (clinicName.endsWith(sw)) {
        clinicName = clinicName.slice(0, -sw.length).trim();
      }
    }
    if (clinicName.length >= 2) {
      console.log(
        "[DEBUG][parseAdminQuery] Intent: get_clinic_details, clinicName:",
        clinicName,
      );
      return {
        intent: "get_clinic_details",
        clinicName: clinicName,
        requiresClarification: false,
        explicitStatus: null,
      };
    }
  }

  // [NEW] 2. Kiểm tra danh sách bệnh viện theo trạng thái
  const clinicListMatch = lowerMsg.match(CLINIC_LIST_REGEX);
  if (clinicListMatch) {
    const statusKeyword = clinicListMatch[1].toLowerCase();
    const statuses = statusKeywordMap[statusKeyword];
    if (statuses) {
      console.log(
        "[DEBUG][parseAdminQuery] Intent: list_clinics_by_approval_status, statuses:",
        statuses,
      );
      return {
        intent: "list_clinics_by_approval_status",
        statuses: statuses,
        statusLabel: statusKeyword,
        requiresClarification: false,
        explicitStatus: null,
      };
    }
  }

  // 3. Kiểm tra clinic có tên cụ thể (list_doctors_by_clinic) – GIỮ NGUYÊN LOGIC CŨ
  const clinicMatch = lowerMsg.match(CLINIC_REGEX);
  console.log("[DEBUG][parseAdminQuery] clinicMatch:", clinicMatch);
  if (clinicMatch?.[1]) {
    let clinicName = clinicMatch[1].trim();
    const stopWords = [
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
    for (const sw of stopWords) {
      if (clinicName.endsWith(sw)) {
        clinicName = clinicName.slice(0, -sw.length).trim();
      }
    }
    if (clinicName.length >= 2) {
      let explicitStatus = null;
      if (EXPLICIT_PENDING_REGEX.test(lowerMsg)) explicitStatus = "pending";
      else if (EXPLICIT_APPROVED_REGEX.test(lowerMsg))
        explicitStatus = "approved";
      console.log(
        "[DEBUG][parseAdminQuery] Intent: list_doctors_by_clinic, clinic:",
        clinicName,
        "explicitStatus:",
        explicitStatus,
      );
      return {
        intent: "list_doctors_by_clinic",
        clinicName: clinicName,
        explicitStatus: explicitStatus,
        requiresClarification: false,
      };
    }
  }

  // 4. Kiểm tra chuyên khoa – GIỮ NGUYÊN
  const specialtyMatch = lowerMsg.match(SPECIALTY_REGEX);
  if (specialtyMatch?.[1]) {
    const cleanSpecialty = specialtyMatch[1]
      .replace(STOP_WORDS_REGEX, "")
      .trim();
    if (cleanSpecialty.length >= 2) {
      console.log(
        "[DEBUG][parseAdminQuery] Intent: list_doctors_by_specialty, specialty:",
        cleanSpecialty,
      );
      return {
        intent: "list_doctors_by_specialty",
        specialtyName: cleanSpecialty,
        requiresClarification: false,
        explicitStatus: null,
      };
    }
  }

  // 5. Thống kê số lượng bác sĩ – GIỮ NGUYÊN
  const isPending = PENDING_REGEX.test(lowerMsg);
  const isApproved = !isPending && APPROVED_REGEX.test(lowerMsg);
  if (isPending || isApproved) {
    const statusType = isPending ? "pending" : "approved";
    const requiresDetail = REQUIRE_DETAIL_REGEX.test(lowerMsg);
    console.log(
      "[DEBUG][parseAdminQuery] Intent: count_doctors_by_approval_status, statusType:",
      statusType,
      "requiresDetail:",
      requiresDetail,
    );
    if (requiresDetail) {
      return {
        intent: "count_doctors_by_approval_status",
        statusType,
        requiresClarification: true,
        clarificationMessage:
          "Em chỉ có thể thống kê số lượng bác sĩ đã duyệt/chưa duyệt trên toàn hệ thống. Nếu cần xem danh sách chi tiết hoặc lọc theo bệnh viện/chuyên khoa, vui lòng đặt câu hỏi riêng ạ.",
        explicitStatus: null,
      };
    }
    return {
      intent: "count_doctors_by_approval_status",
      statusType,
      requiresClarification: false,
      explicitStatus: null,
    };
  }

  // 6. Mơ hồ về bác sĩ – GIỮ NGUYÊN
  if (/(bác sĩ|bs)/i.test(lowerMsg)) {
    console.log("[DEBUG][parseAdminQuery] Intent: ambiguous_doctor_status");
    return {
      intent: "ambiguous_doctor_status",
      requiresClarification: true,
      clarificationMessage:
        "Anh/chị muốn xem số lượng bác sĩ **đã duyệt** hay **chưa duyệt** ạ?",
      explicitStatus: null,
    };
  }

  console.log("[DEBUG][parseAdminQuery] Intent: unknown");
  return {
    intent: "unknown",
    requiresClarification: false,
    explicitStatus: null,
  };
};
