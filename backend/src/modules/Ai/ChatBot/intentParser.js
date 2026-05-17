// ============================================================================
// BỘ TỪ KHÓA DỪNG (STOP-WORDS) ĐƯỢC TỐI ƯU HÓA
// ============================================================================
import { STOP_WORDS } from "../../../utils/STOP_WORDS.js";

// 1. NHẬN DIỆN Ý ĐỊNH (INTENT DETECTION)
const detectIntent = (lowerText) => {
  // ----- INTENT MỚI: TÌM BÁC SĨ THEO BỆNH VIỆN + CHUYÊN KHOA -----
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

  // ----- INTENT: HỎI GIÁ KHÁM CỦA BÁC SĨ -----
  if (
    /(giá khám|phí khám|khám giá bao nhiêu|chi phí khám|bao nhiêu tiền)\s+(của\s+)?(bác sĩ|bs)\s+([a-zà-ỹ\s]+)/i.test(
      lowerText,
    )
  ) {
    return "doctor_fee";
  }

  // ----- INTENT: HỎI THÔNG TIN BÁC SĨ -----
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,})/i.test(lowerText) &&
    /(thông tin|giới thiệu|profile|là ai|tốt không|khám gì|chuyên khoa gì)/i.test(
      lowerText,
    )
  ) {
    return "doctor_info";
  }

  // ----- INTENT: BÁC SĨ THUỘC CHUYÊN KHOA NÀO -----
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(thuộc chuyên khoa|chuyên khoa gì|là khoa gì|chuyên ngành gì)/i.test(
      lowerText,
    )
  ) {
    return "doctor_specialty";
  }

  // ----- INTENT: BÁC SĨ CÓ TRONG BỆNH VIỆN Y KHÔNG -----
  if (
    /(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s+(có trong|có ở|làm tại|công tác tại)\s+(bệnh viện|phòng khám)\s+([^,?.!]+?)\s*(không|chưa|hả|ko)?/i.test(
      lowerText,
    )
  ) {
    return "doctor_in_clinic";
  }

  // ----- INTENT: BỆNH VIỆN Z CÓ BÁC SĨ M KHÔNG -----
  if (
    /(bệnh viện|phòng khám)\s+([^,?.!]+?)\s+(có|không có)\s+(bác sĩ|bs)\s+([a-zà-ỹ\s]{2,}?)\s*(không|chưa|ko)?/i.test(
      lowerText,
    )
  ) {
    return "clinic_has_doctor";
  }

  // ----- INTENT: KIỂM TRA TỒN TẠI BỆNH VIỆN (chỉ khi có tên cụ thể) -----
  if (
    /(có|thấy|biết|tìm thấy)\s+(bệnh viện|phòng khám|cơ sở y tế)\s+(?!nào|gì|đâu)([a-zà-ỹ\s]{2,}?)\s+(không|chưa|hả|ko)/i.test(
      lowerText,
    )
  ) {
    return "check_hospital_existence";
  }

  // ----- INTENT: KIỂM TRA CHUYÊN KHOA TRONG BỆNH VIỆN -----
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

  // ----- INTENT: CHẶN CÂU HỎI NGOÀI LỀ -----
  if (
    /(chó|mèo|vật nuôi|thú cưng|cây cảnh|thời tiết|nấu ăn|bóng đá|chính trị)/.test(
      lowerText,
    )
  ) {
    return "off_topic";
  }

  // ----- INTENT: CHẶN YÊU CẦU KÊ ĐƠN THUỐC -----
  if (
    /(kê đơn|kê thuốc|mua thuốc|bán thuốc|uống thuốc gì|liều thuốc|cho thuốc)/.test(
      lowerText,
    )
  ) {
    return "prescription_request";
  }

  // ----- INTENT: CÂU HỎI CÁ NHÂN -----
  if (
    /(lịch hẹn|cuộc hẹn|lịch khám|kết quả|đơn thuốc|toa thuốc|hồ sơ|bảo hiểm|thanh toán)/.test(
      lowerText,
    )
  ) {
    return "personal_query";
  }

  // ----- INTENT: TÌM KIẾM DỊCH VỤ CHUNG -----
  if (
    /(bệnh viện|phòng khám|cơ sở y tế|bác sĩ|bs|chuyên khoa)/.test(lowerText)
  ) {
    return "search_service";
  }

  return "general_symptom";
};

// 2. BÓC TÁCH THỰC THỂ (ENTITY EXTRACTION) – ĐÃ SỬA
const extractEntities = (originalText) => {
  let clinicName = null;
  let specialtyName = null;
  let doctorName = null;
  let preferGood = false;

  // [SURGICAL FIX]: Thêm (?<!đa\s+) để không cho phép từ 'khoa' trong 'đa khoa' kích hoạt ngắt Lookahead
  const clinicMatch = originalText.match(
    /(?:bệnh viện|phòng khám|tại|ở)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|(?<!đa\s+)\bkhoa\b|chuyên\s+khoa|không|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (clinicMatch) {
    let raw = clinicMatch[1].trim();
    raw = raw.replace(/\s*(nào|hả|chưa|ko|không)$/i, "");
    clinicName = raw;
  }

  // [SURGICAL FIX]: Thêm (?<!đa\s+)\b để ép Regex bỏ qua chữ 'khoa' thuộc cụm mô tả 'đa khoa' của bệnh viện
  const specMatch = originalText.match(
    /(?<!đa\s+)\b(?:chuyên\s+khoa|khoa)\s+([^,?.!]+?)(?=\s*(?:[,?.!])?\s+(?:có|bác sĩ|bs|không|giỏi|tốt|nào|hả|chưa|ko|ở|tại)|$)/i,
  );
  if (specMatch) {
    let raw = specMatch[1].trim();
    raw = raw.replace(/\s*(nào|hả|chưa|ko|không)$/i, "");
    specialtyName = raw;
  }

  // Lấy tên Bác sĩ (Giữ nguyên toàn bộ phần phía dưới)
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

// 3. TRÍCH XUẤT ĐỊA ĐIỂM
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

// 4. HÀM EXPORT parseQuery
export const parseQuery = (message) => {
  if (!message || typeof message !== "string") {
    return { intent: "unknown", requiresDbQuery: false };
  }

  const intent = detectIntent(message.toLowerCase());
  const entities = extractEntities(message);

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
    !!entities.clinicName ||
    !!entities.specialtyName ||
    !!entities.doctorName;

  return {
    intent,
    ...entities,
    requiresDbQuery,
  };
};
