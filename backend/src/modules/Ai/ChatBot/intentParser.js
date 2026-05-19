// ============================================================
// backend/src/utils/intentParser.js
// ============================================================
import { STOP_WORDS } from "../../../utils/STOP_WORDS.js";

// ==================== 1. NHẬN DIỆN Ý ĐỊNH (ĐÃ SỬA THỨ TỰ) ====================
const detectIntent = (lowerText) => {
  // 1. booking_request (cao nhất)
  if (
    /(đặt lịch|đặt lịch khám|đặt hẹn|đặt lịch hẹn|muốn đặt lịch|cần đặt lịch|đăng ký khám|đăng ký lịch khám|book lịch|book khám|cách đặt lịch|hướng dẫn đặt lịch|làm thế nào để đặt lịch|cho tôi hỏi đặt lịch)(\s+với\s+(bác sĩ|bs)\s+([a-zà-ỹ\s]+))?/i.test(
      lowerText,
    )
  ) {
    return "booking_request";
  }

  // 2. find_doctors_by_clinic_specialty
  if (
    /(ở|tại)\s+(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|có những)\s+(bác sĩ|bs)\s+(chuyên khoa|khoa)\s+([^,?.!]+?)\s*(nào|không)?/i.test(
      lowerText,
    ) ||
    /(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|có những)\s+(bác sĩ|bs)\s+(chuyên khoa|khoa)\s+([^,?.!]+?)\s*(nào|không)?/i.test(
      lowerText,
    )
  ) {
    return "find_doctors_by_clinic_specialty";
  }

  // 3. doctor_fee
  if (
    /(giá khám|phí khám|khám giá bao nhiêu|chi phí khám|bao nhiêu tiền)\s+(của\s+)?(bác sĩ|bs)\s+([a-zà-ỹ\s]+)/i.test(
      lowerText,
    )
  ) {
    return "doctor_fee";
  }

  // 4. doctor_info
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,})/i.test(lowerText) &&
    /(thông tin|giới thiệu|profile|là ai|tốt không|khám gì|chuyên khoa gì)/i.test(
      lowerText,
    )
  ) {
    return "doctor_info";
  }

  // 5. doctor_specialty
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(thuộc chuyên khoa|chuyên khoa gì|là khoa gì|chuyên ngành gì)/i.test(
      lowerText,
    )
  ) {
    return "doctor_specialty";
  }

  // 6. doctor_in_clinic
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(có trong|có ở|làm tại|công tác tại)\s+(bệnh viện|phòng khám)\s+([^,?.!]+?)\s*(không|chưa|hả|ko)?/i.test(
      lowerText,
    )
  ) {
    return "doctor_in_clinic";
  }

  // 7. clinic_has_doctor
  if (
    /(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|không có)\s+(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s*(không|chưa|ko)?/i.test(
      lowerText,
    )
  ) {
    return "clinic_has_doctor";
  }

  // 8. check_hospital_existence
  if (
    /(có|thấy|biết|tìm thấy)\s+(bệnh viện|phòng khám|cơ sở y tế)\s+(?!nào|gì|đâu)([a-zà-ỹ\s]{2,}?)\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    )
  ) {
    return "check_hospital_existence";
  }

  // 9. check_specialty_in_clinic
  if (
    /(bệnh viện|phòng khám|cơ sở y tế)\s+.+\s+(có|với|bao gồm)\s+(chuyên khoa|khoa)\s+.+\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    ) ||
    /(chuyên khoa|khoa)\s+.+\s+(có|nằm trong|thuộc)\s+(bệnh viện|phòng khám)\s+.+\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    )
  ) {
    return "check_specialty_in_clinic";
  }

  // ========== QUAN TRỌNG: PERSONAL_QUERY PHẢI Ở TRƯỚC OFF_TOPIC ==========
  // 10. personal_query (câu hỏi về dữ liệu cá nhân)
  if (
    /(lịch hẹn|cuộc hẹn|lịch khám|kết quả|đơn thuốc|toa thuốc|hồ sơ|bảo hiểm|thanh toán)/.test(
      lowerText,
    )
  ) {
    return "personal_query";
  }

  // 11. off_topic (các chủ đề ngoài y tế con người)
  if (
    /(chó|cún|mèo|vật nuôi|thú cưng|thú y|động vật|heo|lợn|gà|vịt|chim|cá|chuột|hamster|bò|trâu|ngựa|cây cảnh|thời tiết|nấu ăn|bóng đá|chính trị)/.test(
      lowerText,
    )
  ) {
    return "off_topic";
  }

  // 12. prescription_request
  if (
    /(kê đơn|kê thuốc|mua thuốc|bán thuốc|uống thuốc gì|liều thuốc|cho thuốc)/.test(
      lowerText,
    )
  ) {
    return "prescription_request";
  }

  // 13. search_service
  if (
    /(bệnh viện|phòng khám|cơ sở y tế|bác sĩ|bs|chuyên khoa)/.test(lowerText)
  ) {
    return "search_service";
  }

  return "general_symptom";
};

// ==================== 2. BÓC TÁCH THỰC THỂ ====================
const extractEntities = (originalText) => {
  let clinicName = null;
  let specialtyName = null;
  let doctorName = null;
  let preferGood = false;

  // Clinic name
  const clinicMatch = originalText.match(
    /(?:bệnh viện|phòng khám|tại|ở)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|(?<!đa\s+)\bkhoa\b|chuyên\s+khoa|không|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (clinicMatch) {
    let raw = clinicMatch[1].trim();
    raw = raw.replace(/\s*(nào|hả|chưa|ko|không)$/i, "");
    clinicName = raw;
  }

  // Specialty name
  const specMatch = originalText.match(
    /(?<!đa\s+)\b(?:chuyên\s+khoa|khoa)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|không|giỏi|tốt|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (specMatch) {
    let raw = specMatch[1].trim();
    raw = raw.replace(/\s*(nào|hả|chưa|ko|không)$/i, "");
    specialtyName = raw;
  }

  // Doctor name
  const docMatch = originalText.match(/(?:bác sĩ|bs|doctor)\s+(.*)/i);
  if (docMatch && docMatch[1]) {
    const words = docMatch[1].trim().split(/\s+/);
    const nameWords = [];
    for (let word of words) {
      const cleanWord = word.replace(/[.,!?]+$/, "").toLowerCase();
      if (STOP_WORDS.has(cleanWord)) break;
      nameWords.push(word.replace(/[.,!?]+$/, ""));
    }
    const finalName = nameWords.join(" ").trim();
    if (finalName.length > 0 && nameWords.length <= 5) {
      doctorName = finalName;
    }
  }

  if (!doctorName) {
    const altDoctorMatch = originalText.match(
      /(?:bác sĩ|bs)\s+([a-zà-ỹ\s]{2,20}?)(?=\s+(?:thuộc|có trong|làm tại|trong|có))/i,
    );
    if (altDoctorMatch) doctorName = altDoctorMatch[1].trim();
  }

  if (
    /(giỏi|tốt|uy tín|nổi tiếng|cao tay|chuyên môn cao|kinh nghiệm)/i.test(
      originalText,
    )
  ) {
    preferGood = true;
  }

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
const extractPersonalEntity = (text) => {
  const lower = text.toLowerCase();
  if (/(lịch hẹn|lịch khám|các cuộc hẹn|danh sách lịch)/i.test(lower))
    return "appointments";
  if (/(đơn thuốc|toa thuốc)/i.test(lower)) return "prescriptions";
  if (/(kết quả khám|kết quả xét nghiệm)/i.test(lower)) return "results";
  if (/(hồ sơ bệnh án|hồ sơ sức khỏe)/i.test(lower)) return "records";
  if (/(thanh toán|viện phí|hóa đơn)/i.test(lower)) return "payments";
  return "general";
};

// ==================== 5. TRÍCH XUẤT NGÀY THÁNG (SỬA PATTERN CHO PHÉP 1-2 CHỮ SỐ) ====================
const extractDateFromQuery = (text) => {
  console.log(`[DEBUG extractDateFromQuery] Input text: "${text}"`);
  const lower = text.toLowerCase();
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  // Relative dates
  if (/(hôm nay|today)/i.test(lower)) {
    const result = todayUTC.toISOString().split("T")[0];
    console.log(`[DEBUG extractDateFromQuery] Matched "hôm nay" -> ${result}`);
    return result;
  }
  if (/(ngày mai|tomorrow)/i.test(lower)) {
    const tomorrow = new Date(todayUTC);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const result = tomorrow.toISOString().split("T")[0];
    console.log(`[DEBUG extractDateFromQuery] Matched "ngày mai" -> ${result}`);
    return result;
  }
  if (/(hôm qua|yesterday)/i.test(lower)) {
    const yesterday = new Date(todayUTC);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const result = yesterday.toISOString().split("T")[0];
    console.log(`[DEBUG extractDateFromQuery] Matched "hôm qua" -> ${result}`);
    return result;
  }

  // Pattern "ngày dd/mm/yyyy" hoặc "ngày d/m/yyyy" (hỗ trợ 1 hoặc 2 chữ số)
  let match = text.match(/ngày\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
  if (match) {
    console.log(
      `[DEBUG extractDateFromQuery] Matched pattern "ngày dd/mm/yyyy":`,
      match,
    );
    let [_, day, month, year] = match;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    const result = `${year}-${month}-${day}`;
    console.log(`[DEBUG extractDateFromQuery] Returning: ${result}`);
    return result;
  }

  // Pattern dd/mm/yyyy hoặc d/m/yyyy (không có "ngày")
  match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    console.log(
      `[DEBUG extractDateFromQuery] Matched pattern "dd/mm/yyyy":`,
      match,
    );
    let [_, day, month, year] = match;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    const result = `${year}-${month}-${day}`;
    console.log(`[DEBUG extractDateFromQuery] Returning: ${result}`);
    return result;
  }

  // Pattern dd/mm (không năm) -> dùng năm hiện tại
  match = text.match(/(\d{1,2})[\/\-](\d{1,2})(?![\/\-\d])/);
  if (match) {
    console.log(`[DEBUG extractDateFromQuery] Matched pattern "dd/mm":`, match);
    let [_, day, month] = match;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    const year = today.getFullYear();
    const result = `${year}-${month}-${day}`;
    console.log(
      `[DEBUG extractDateFromQuery] Returning (current year): ${result}`,
    );
    return result;
  }

  // Pattern "ngày X tháng Y" hoặc "ngày X tháng Y năm Z"
  match = text.match(
    /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/i,
  );
  if (match) {
    console.log(
      `[DEBUG extractDateFromQuery] Matched pattern "ngày X tháng Y":`,
      match,
    );
    let [_, day, month, year] = match;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    if (!year) year = today.getFullYear();
    const result = `${year}-${month}-${day}`;
    console.log(`[DEBUG extractDateFromQuery] Returning: ${result}`);
    return result;
  }

  console.log(
    `[DEBUG extractDateFromQuery] No pattern matched, returning null`,
  );
  return null;
};

// ==================== 6. HÀM PARSE QUERY CHÍNH ====================
export const parseQuery = (message) => {
  console.log(`[DEBUG parseQuery] Message: "${message}"`);
  if (!message || typeof message !== "string") {
    return { intent: "unknown", requiresDbQuery: false };
  }

  const intent = detectIntent(message.toLowerCase());
  const entities = extractEntities(message);
  let personalEntity = null;
  let targetDate = null;

  if (intent === "personal_query") {
    personalEntity = extractPersonalEntity(message);
    if (personalEntity === "appointments") {
      targetDate = extractDateFromQuery(message);
      console.log(
        `[DEBUG parseQuery] targetDate after extraction: ${targetDate}`,
      );
    }
  }

  const requiresDbQuery =
    intent === "search_service" ||
    intent === "check_hospital_existence" ||
    intent === "check_specialty_in_clinic" ||
    intent === "doctor_info" ||
    intent === "doctor_fee" ||
    intent === "doctor_specialty" ||
    intent === "doctor_in_clinic" ||
    intent === "clinic_has_doctor" ||
    intent === "find_doctors_by_clinic_specialty" ||
    intent === "booking_request" ||
    !!entities.clinicName ||
    !!entities.specialtyName ||
    !!entities.doctorName;

  const result = {
    intent,
    ...entities,
    personalEntity,
    targetDate,
    requiresDbQuery,
  };

  console.log(`[DEBUG parseQuery] Returning:`, JSON.stringify(result, null, 2));
  return result;
};
