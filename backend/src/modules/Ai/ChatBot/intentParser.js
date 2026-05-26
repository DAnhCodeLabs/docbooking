// ============================================================
// backend/src/utils/intentParser.js
// ============================================================
import { STOP_WORDS } from "../../../utils/STOP_WORDS.js";

// ==================== 1. NHẬN DIỆN Ý ĐỊNH ====================
const detectIntent = (lowerText) => {
  if (
    /(đặt lịch|đặt lịch khám|đặt hẹn|đặt lịch hẹn|muốn đặt lịch|cần đặt lịch|đăng ký khám|đăng ký lịch khám|book lịch|book khám|cách đặt lịch|hướng dẫn đặt lịch|làm thế nào để đặt lịch|cho tôi hỏi đặt lịch)(\s+với\s+(bác sĩ|bs)\s+([a-zà-ỹ\s]+))?/i.test(
      lowerText,
    )
  )
    return "booking_request";

  if (
    /(có bao nhiêu|danh sách|liệt kê|tìm|cho tôi biết|tất cả)\s+(bác sĩ|bs)\s*(chuyên khoa|khoa)\s+([^,?.!]+)/i.test(
      lowerText,
    ) &&
    !/(bệnh viện|phòng khám|tại|ở)/i.test(lowerText)
  ) {
    return "find_doctors_by_specialty";
  }

  if (
    /(ở|tại)?\s*(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|có những)\s+(bác sĩ|bs)\s+(chuyên khoa|khoa)\s+([^,?.!]+?)\s*(nào|không)?/i.test(
      lowerText,
    )
  )
    return "find_doctors_by_clinic_specialty";

  if (
    /(giá khám|phí khám|khám giá bao nhiêu|chi phí khám|bao nhiêu tiền)\s+(của\s+)?(bác sĩ|bs)\s+([a-zà-ỹ\s]+)/i.test(
      lowerText,
    )
  )
    return "doctor_fee";

  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,})/i.test(lowerText) &&
    /(thông tin|giới thiệu|profile|là ai|tốt không|khám gì|chuyên khoa gì)/i.test(
      lowerText,
    )
  )
    return "doctor_info";

  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(thuộc chuyên khoa|chuyên khoa gì|là khoa gì|chuyên ngành gì)/i.test(
      lowerText,
    )
  )
    return "doctor_specialty";

  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(có trong|có ở|làm tại|công tác tại)\s+(bệnh viện|phòng khám)\s+([^,?.!]+?)\s*(không|chưa|hả|ko)?/i.test(
      lowerText,
    )
  )
    return "doctor_in_clinic";

  if (
    /(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|không có)\s+(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s*(không|chưa|ko)?/i.test(
      lowerText,
    )
  )
    return "clinic_has_doctor";

  if (
    /(có|thấy|biết|tìm thấy)\s+(bệnh viện|phòng khám|cơ sở y tế)\s+(?!nào|gì|đâu)([a-zà-ỹ\s]{2,}?)\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    )
  )
    return "check_hospital_existence";

  if (
    /(bệnh viện|phòng khám|cơ sở y tế)\s+.+\s+(có|với|bao gồm)\s+(chuyên khoa|khoa)\s+.+\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    ) ||
    /(chuyên khoa|khoa)\s+.+\s+(có|nằm trong|thuộc)\s+(bệnh viện|phòng khám)\s+.+\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    )
  )
    return "check_specialty_in_clinic";

  if (
    /(lịch hẹn|cuộc hẹn|lịch khám|kết quả|đơn thuốc|toa thuốc|hồ sơ|bảo hiểm|thanh toán)/.test(
      lowerText,
    )
  )
    return "personal_query";

  if (
    /(chó|cún|mèo|vật nuôi|thú cưng|thú y|động vật|heo|lợn|gà|vịt|chim|cá|chuột|hamster|bò|trâu|ngựa|cây cảnh|thời tiết|nấu ăn|bóng đá|chính trị)/.test(
      lowerText,
    )
  )
    return "off_topic";

  if (
    /(kê đơn|kê thuốc|mua thuốc|bán thuốc|uống thuốc gì|liều thuốc|cho thuốc)/.test(
      lowerText,
    )
  )
    return "prescription_request";

  if (/(bệnh viện|phòng khám|cơ sở y tế|bác sĩ|bs|chuyên khoa)/.test(lowerText))
    return "search_service";

  return "general_symptom";
};

// ==================== 2. BÓC TÁCH THỰC THỂ ====================
const extractEntities = (originalText) => {
  let clinicName = null,
    specialtyName = null,
    doctorName = null;

  const cleanSuffix = (str) =>
    str.replace(/\s*(nào|hả|chưa|ko|không)$/i, "").trim();

  const clinicMatch = originalText.match(
    /(?:bệnh viện|phòng khám|tại|ở)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|(?<!đa\s+)\bkhoa\b|chuyên\s+khoa|không|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (clinicMatch) clinicName = cleanSuffix(clinicMatch[1]);

  const specMatch = originalText.match(
    /(?<!đa\s+)\b(?:chuyên\s+khoa|khoa)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|không|giỏi|tốt|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (specMatch) specialtyName = cleanSuffix(specMatch[1]);

  const docMatch = originalText.match(/(?:bác sĩ|bs|doctor)\s+(.*)/i);
  if (docMatch && docMatch[1]) {
    const nameWords = [];
    for (const word of docMatch[1].trim().split(/\s+/)) {
      const cleanWord = word.replace(/[.,!?]+$/, "").toLowerCase();
      if (STOP_WORDS.has(cleanWord)) break;
      nameWords.push(word.replace(/[.,!?]+$/, ""));
    }
    const finalName = nameWords.join(" ").trim();
    if (finalName && nameWords.length <= 5) doctorName = finalName;
  }

  if (!doctorName) {
    const altDoctorMatch = originalText.match(
      /(?:bác sĩ|bs)\s+([a-zà-ỹ\s]{2,20}?)(?=\s+(?:thuộc|có trong|làm tại|trong|có))/i,
    );
    if (altDoctorMatch) doctorName = altDoctorMatch[1].trim();
  }

  const preferGood =
    /(giỏi|tốt|uy tín|nổi tiếng|cao tay|chuyên môn cao|kinh nghiệm)/i.test(
      originalText,
    );

  return { clinicName, specialtyName, doctorName, preferGood };
};

// ==================== 3. TRÍCH XUẤT ĐỊA ĐIỂM ====================
export const extractLocation = (text) => {
  if (!text) return null;
  const cleanedText = text
    .replace(/(khối|xóm|số nhà|ngõ|ngách|hẻm|đội|thôn)\s+\d+/gi, "")
    .replace(/(khối|xóm|số nhà|ngõ|ngách|hẻm|đội|thôn)/gi, "")
    .trim();

  const locationMatch = cleanedText.match(
    /(?:ở|tại|khu vực|quận|huyện|thành phố|tỉnh|tp)\s+([^,?.!]+?)(?=\s+(?:có|bệnh|phòng|chuyên|khám|nào|đâu|không|là)|$)/i,
  );
  return locationMatch ? locationMatch[1].trim() : cleanedText;
};

// ==================== 4. TRÍCH XUẤT THỰC THỂ CÁ NHÂN ====================
const extractPersonalEntity = (lowerText) => {
  if (/(lịch hẹn|lịch khám|các cuộc hẹn|danh sách lịch)/i.test(lowerText))
    return "appointments";
  if (/(đơn thuốc|toa thuốc)/i.test(lowerText)) return "prescriptions";
  if (/(kết quả khám|kết quả xét nghiệm)/i.test(lowerText)) return "results";
  if (/(hồ sơ bệnh án|hồ sơ sức khỏe)/i.test(lowerText)) return "records";
  if (/(thanh toán|viện phí|hóa đơn)/i.test(lowerText)) return "payments";
  return "general";
};

// ==================== 5. TRÍCH XUẤT NGÀY THÁNG ====================
const extractDateFromQuery = (text) => {
  const lower = text.toLowerCase();
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const formatYMD = (year, month, day) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (/(hôm nay|today)/i.test(lower))
    return formatYMD(
      todayUTC.getUTCFullYear(),
      todayUTC.getUTCMonth() + 1,
      todayUTC.getUTCDate(),
    );

  if (/(ngày mai|tomorrow)/i.test(lower)) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() + 1);
    return formatYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  if (/(hôm qua|yesterday)/i.test(lower)) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() - 1);
    return formatYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  let match;
  // Mẫu: ngày dd/mm/yyyy
  if ((match = text.match(/ngày\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i)))
    return formatYMD(match[3], match[2], match[1]);
  // Mẫu: dd/mm/yyyy
  if ((match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)))
    return formatYMD(match[3], match[2], match[1]);
  // Mẫu: ngày X tháng Y năm Z
  if (
    (match = text.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/i,
    ))
  )
    return formatYMD(match[3] || today.getFullYear(), match[2], match[1]);
  // Mẫu: dd/mm (Lấy năm hiện tại)
  if ((match = text.match(/(\d{1,2})[\/\-](\d{1,2})(?![\/\-\d])/)))
    return formatYMD(today.getFullYear(), match[2], match[1]);

  return null;
};

// ==================== 6. HÀM PARSE QUERY CHÍNH ====================
const DB_QUERY_INTENTS = new Set([
  "search_service",
  "check_hospital_existence",
  "check_specialty_in_clinic",
  "doctor_info",
  "doctor_fee",
  "doctor_specialty",
  "doctor_in_clinic",
  "clinic_has_doctor",
  "find_doctors_by_clinic_specialty",
  "booking_request",
  "find_doctors_by_specialty",
]);

export const parseQuery = (message) => {
  if (!message || typeof message !== "string") {
    return { intent: "unknown", requiresDbQuery: false };
  }

  const lowerMsg = message.toLowerCase();
  const intent = detectIntent(lowerMsg);
  const entities = extractEntities(message);

  let personalEntity = null;
  let targetDate = null;

  if (intent === "personal_query") {
    personalEntity = extractPersonalEntity(lowerMsg);
    if (personalEntity === "appointments") {
      targetDate = extractDateFromQuery(message);
    }
  }

  const requiresDbQuery =
    DB_QUERY_INTENTS.has(intent) ||
    !!entities.clinicName ||
    !!entities.specialtyName ||
    !!entities.doctorName;

  return {
    intent,
    ...entities,
    personalEntity,
    targetDate,
    requiresDbQuery,
  };
};
