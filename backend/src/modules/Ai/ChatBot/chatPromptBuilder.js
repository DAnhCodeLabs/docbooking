// Đã chuyển đổi từ truyền tham số tuần tự (11 tham số) sang truyền Object (Destructuring)
// Tối ưu hóa Clean Code: Chống lỗi truyền nhầm thứ tự biến.
export const buildAdaptivePrompt = ({
  specialties,
  hospitals,
  userLoc,
  currentSpec,
  intent,
  existenceResult,
  specialtyCheckResult,
  doctorInfo,
  clinicInfo,
  doctorsInClinic,
  specialtyDoctorsList,
}) => {
  // ----- INTENT: TÌM BÁC SĨ THEO BỆNH VIỆN + CHUYÊN KHOA -----
  if (intent === "find_doctors_by_clinic_specialty") {
    if (!clinicInfo || specialtyDoctorsList === null) {
      return `ROLE: Bạn là Chuyên viên Tư vấn Y tế DOCGO.\nDỮ LIỆU: Không đủ thông tin để tra cứu.\nNHIỆM VỤ: Thông báo không tìm thấy bệnh viện hoặc chuyên khoa.\nYÊU CẦU JSON: {"reply": "Nội dung trả lời", "state_summary": "missing_data"}`;
    }
    if (specialtyDoctorsList.length === 0) {
      const dataSection = `❌ **KẾT QUẢ TRA CỨU:**\n- Bệnh viện: ${clinicInfo.clinicName}\n- Chuyên khoa: ${clinicInfo.specialtyName || "đã chọn"}\n- Không tìm thấy bác sĩ nào phù hợp.`;
      return `ROLE: Bạn là Chuyên viên Tư vấn Y tế DOCGO.\nTONE: Lịch sự.\nDỮ LIỆU: ${dataSection}\nNHIỆM VỤ: Thông báo không có bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "no_doctors_found"}`;
    }
    const doctorListText = specialtyDoctorsList
      .map((doc, idx) => {
        const ratingText = doc.avgRating
          ? `${doc.avgRating.toFixed(1)}/5 (${doc.totalReviews} lượt)`
          : "Chưa có đánh giá";
        const feeText = doc.consultationFee
          ? `${doc.consultationFee.toLocaleString("vi-VN")} VNĐ`
          : "Chưa cập nhật";
        const expText = doc.experience ? `${doc.experience} năm` : "Chưa rõ";
        return `${idx + 1}. **${doc.fullName}**\n   - Kinh nghiệm: ${expText}\n   - Giá khám: ${feeText}\n   - Đánh giá: ⭐ ${ratingText}`;
      })
      .join("\n\n");
    return `ROLE: Bạn là Chuyên viên Tư vấn Y tế DOCGO.\nTONE: Thân thiện.\nDỮ LIỆU THỰC TẾ:\n✅ **KẾT QUẢ TRA CỨU:**\n- Bệnh viện: ${clinicInfo.clinicName}\n- Chuyên khoa: ${clinicInfo.specialtyName || "đã chọn"}\n- Danh sách bác sĩ (${specialtyDoctorsList.length}):\n${doctorListText}\nNHIỆM VỤ: Giới thiệu danh sách bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "find_doctors_by_clinic_specialty|clinic=${clinicInfo.clinicName}"}`;
  }

  // ----- INTENT: BÁC SĨ THUỘC CHUYÊN KHOA NÀO -----
  if (intent === "doctor_specialty") {
    if (doctorInfo && doctorInfo.specialty) {
      const specialtyName = doctorInfo.specialty.name || "chưa cập nhật";
      return `ROLE: Tư vấn viên.\nTONE: Ngắn gọn.\nDỮ LIỆU: ✅ Bác sĩ: ${doctorInfo.fullName}\n- Chuyên khoa: ${specialtyName}\nNHIỆM VỤ: Thông báo chuyên khoa.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_specialty|doctor=${doctorInfo.fullName}"}`;
    } else if (doctorInfo && !doctorInfo.specialty) {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Bác sĩ ${doctorInfo.fullName} chưa cập nhật chuyên khoa.\nNHIỆM VỤ: Báo chưa có thông tin.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_specialty_no_data"}`;
    } else {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bác sĩ.\nNHIỆM VỤ: Báo không tìm thấy.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_specialty_not_found"}`;
    }
  }

  // ----- INTENT: BÁC SĨ CÓ TRONG BỆNH VIỆN Y KHÔNG -----
  if (intent === "doctor_in_clinic") {
    if (doctorInfo && clinicInfo) {
      const normalize = (str) =>
        str
          ? str
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
          : "";
      const doctorClinic = normalize(doctorInfo.clinicName);
      const targetClinic = normalize(clinicInfo.clinicName);
      const belongs =
        doctorClinic &&
        (doctorClinic === targetClinic ||
          doctorClinic.includes(targetClinic) ||
          targetClinic.includes(doctorClinic));

      const dataSection = belongs
        ? `✅ Bác sĩ ${doctorInfo.fullName} CÓ công tác tại ${clinicInfo.clinicName}.`
        : `❌ Bác sĩ ${doctorInfo.fullName} KHÔNG công tác tại ${clinicInfo.clinicName}.`;
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: ${dataSection}\nNHIỆM VỤ: Xác nhận có hay không.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_in_clinic|${belongs ? "yes" : "no"}"}`;
    } else if (!doctorInfo) {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_in_clinic_doctor_not_found"}`;
    } else {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bệnh viện.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_in_clinic_clinic_not_found"}`;
    }
  }

  // ----- INTENT: BỆNH VIỆN Z CÓ BÁC SĨ M KHÔNG -----
  if (intent === "clinic_has_doctor") {
    if (clinicInfo && doctorsInClinic !== null) {
      const doctorNameQuery = doctorInfo?.fullName || "bác sĩ này";
      const found = doctorInfo
        ? doctorsInClinic.some((d) =>
            d.fullName
              .toLowerCase()
              .includes(doctorInfo.fullName.toLowerCase()),
          )
        : false;

      if (found) {
        return `ROLE: Tư vấn viên.\nDỮ LIỆU: ✅ Bệnh viện ${clinicInfo.clinicName} CÓ bác sĩ ${doctorNameQuery}.\nNHIỆM VỤ: Xác nhận có.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "clinic_has_doctor|yes"}`;
      } else {
        const doctorList = doctorsInClinic
          .slice(0, 3)
          .map((d) => d.fullName)
          .join(", ");
        const suggestion = doctorList
          ? `Các bác sĩ hiện có: ${doctorList}.`
          : "Hiện chưa có bác sĩ nào.";
        return `ROLE: Tư vấn viên.\nDỮ LIỆU: ❌ Bệnh viện ${clinicInfo.clinicName} KHÔNG có bác sĩ ${doctorNameQuery}.\n- ${suggestion}\nNHIỆM VỤ: Báo không có.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "clinic_has_doctor|no"}`;
      }
    } else if (!clinicInfo) {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bệnh viện.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "clinic_has_doctor_clinic_not_found"}`;
    } else {
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "clinic_has_doctor_doctor_not_found"}`;
    }
  }

  // ----- INTENT: HỎI GIÁ KHÁM -----
  if (intent === "doctor_fee") {
    if (doctorInfo) {
      const feeText =
        doctorInfo.consultationFee && doctorInfo.consultationFee > 0
          ? `${doctorInfo.consultationFee.toLocaleString("vi-VN")} VNĐ`
          : "chưa được cập nhật";
      return `ROLE: Tư vấn viên.\nDỮ LIỆU: ✅ Bác sĩ: ${doctorInfo.fullName} | Giá khám: ${feeText}\nNHIỆM VỤ: Thông báo giá.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_fee|doctor=${doctorInfo.fullName}"}`;
    }
    return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_fee_not_found"}`;
  }

  // ----- INTENT: THÔNG TIN BÁC SĨ -----
  if (intent === "doctor_info") {
    if (doctorInfo) {
      const avgRating =
        doctorInfo.totalReviews > 0
          ? (doctorInfo.sumRating / doctorInfo.totalReviews).toFixed(1)
          : "Chưa có";
      const feeFormatted = doctorInfo.consultationFee
        ? doctorInfo.consultationFee.toLocaleString("vi-VN") + " VNĐ"
        : "Chưa cập nhật";
      const expText = doctorInfo.experience
        ? `${doctorInfo.experience} năm`
        : "Chưa cập nhật";
      const workplaceText = doctorInfo.clinicName
        ? doctorInfo.clinicAddress
          ? `${doctorInfo.clinicName} - ${doctorInfo.clinicAddress}`
          : doctorInfo.clinicName
        : "Chưa cập nhật";

      const dataSection = `✅ **KẾT QUẢ TRA CỨU BÁC SĨ:**\n- **Họ tên**: ${doctorInfo.fullName}\n- **Chuyên khoa**: ${doctorInfo.specialty?.name || "Đang cập nhật"}\n- **Kinh nghiệm**: ${expText}\n- **Phí khám**: ${feeFormatted}\n- **Đánh giá**: ⭐ ${avgRating}/5\n- **Nơi công tác**: ${workplaceText}\n- **Mô tả**: ${doctorInfo.bio || "Chưa cập nhật."}`;
      return `ROLE: Tư vấn viên.\nDỮ LIỆU THỰC TẾ:\n${dataSection}\nNHIỆM VỤ: Giới thiệu bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_info|doctor=${doctorInfo.fullName}"}`;
    }
    return `ROLE: Tư vấn viên.\nDỮ LIỆU: Không tìm thấy bác sĩ.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "doctor_info_not_found"}`;
  }

  // ----- INTENT: KIỂM TRA CHUYÊN KHOA TRONG BỆNH VIỆN -----
  if (intent === "check_specialty_in_clinic") {
    let dataSection = "";
    if (specialtyCheckResult?.found && specialtyCheckResult.hasSpecialty) {
      dataSection = `✅ Bệnh viện "${specialtyCheckResult.clinic.clinicName}" CÓ chuyên khoa "${specialtyCheckResult.specialty.name}".\n- Địa chỉ: ${specialtyCheckResult.clinic.address}`;
    } else if (
      specialtyCheckResult?.found &&
      !specialtyCheckResult.hasSpecialty
    ) {
      const specList = specialtyCheckResult.availableSpecialtiesNames?.length
        ? specialtyCheckResult.availableSpecialtiesNames.slice(0, 5).join(", ")
        : "chưa có dữ liệu";
      dataSection = `❌ Bệnh viện "${specialtyCheckResult.clinic.clinicName}" KHÔNG có chuyên khoa "${specialtyCheckResult.specialty.name}".\n- Các khoa hiện có: ${specList}`;
    } else if (specialtyCheckResult?.errorType === "clinic_not_found") {
      dataSection = `❌ Không tìm thấy bệnh viện "${specialtyCheckResult.queryClinicName}".`;
    } else if (specialtyCheckResult?.errorType === "specialty_not_found") {
      dataSection = `❌ Không tìm thấy chuyên khoa "${specialtyCheckResult.querySpecialtyName}".`;
    } else {
      dataSection = `❌ Thông tin chưa đầy đủ.`;
    }
    return `ROLE: Tư vấn viên.\nDỮ LIỆU THỰC TẾ:\n${dataSection}\nNHIỆM VỤ: Trả lời có/không.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "specialty_check|result"}`;
  }

  // ----- INTENT: KIỂM TRA TỒN TẠI BỆNH VIỆN -----
  if (intent === "check_hospital_existence") {
    let dataSection =
      existenceResult?.found && existenceResult?.clinic
        ? `✅ Bệnh viện "${existenceResult.clinic.clinicName}" CÓ trong hệ thống.\n- Địa chỉ: ${existenceResult.clinic.address}`
        : `❌ Không tìm thấy cơ sở y tế với tên "${existenceResult?.queryName || "đã nhập"}".`;
    return `ROLE: Tư vấn viên.\nDỮ LIỆU THỰC TẾ:\n${dataSection}\nNHIỆM VỤ: Xác nhận bệnh viện.\nYÊU CẦU JSON: {"reply": "...", "state_summary": "check_existence|found=${existenceResult?.found}"}`;
  }

  // ========== CÁC INTENT CHUNG (MẶC ĐỊNH) ==========
  const specialtyList = specialties.map((s) => `- ${s.name}`).join("\n");
  const displaySpec =
    intent === "hospital" && currentSpec === "Nội tổng quát"
      ? "Đa chuyên khoa (Khám tổng quát)"
      : currentSpec;
  const hospitalData =
    hospitals.length > 0
      ? hospitals
          .map(
            (h) =>
              `🏥 **${h.clinicName}**\n📍 Địa chỉ: ${h.address}\n🩺 Tiếp nhận: ${displaySpec}`,
          )
          .join("\n\n")
      : "[KHÔNG CÓ DỮ LIỆU CƠ SỞ Y TẾ TRÊN HỆ THỐNG]";

  const workflowInstruction =
    intent === "hospital"
      ? `TÌNH HUỐNG: Tra cứu cơ sở y tế. BƯỚC 1: Hiển thị Bệnh viện (nếu có). BƯỚC 2: Mở rộng nhu cầu khám.`
      : `TÌNH HUỐNG: Tư vấn bệnh lý. BƯỚC 1: Làm rõ triệu chứng. BƯỚC 2: Tư vấn mẹo. BƯỚC 3: Gợi ý chuyên khoa/bệnh viện.`;

  return `ROLE: Chuyên viên Tư vấn Y tế DOCGO.\nDANH SÁCH CHUYÊN KHOA:\n${specialtyList}\n\nDỮ LIỆU CƠ SỞ TẠI [${userLoc || "Khu vực của bạn"}]:\n${hospitalData}\n\nQUY TRÌNH XỬ LÝ:\n${workflowInstruction}\nRÀNG BUỘC: [JSON MODE]: {"reply": "...", "state_summary": "..."} - [CHỐNG ẢO GIÁC]: Cấm bịa đặt bệnh viện/bác sĩ.`;
};
