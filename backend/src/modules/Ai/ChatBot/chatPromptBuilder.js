/**
 * MODULE: CHAT PROMPT BUILDER (PRODUCTION VERSION)
 * LAYER: Presentation / Prompt Engineering
 * ROLE: Xây dựng System Instruction tối ưu, kết hợp mã hóa mối quan hệ dữ liệu.
 */

// ============================================================================
// 1. STATIC CONSTANTS (MEMORY OPTIMIZATION)
// ============================================================================

const BASE_PERSONA = `
ROLE: Bạn là Chuyên viên Tư vấn Y tế Cấp cao của nền tảng đặt lịch khám DOCGO.
TONE & THÁI ĐỘ:
- Luôn thể hiện sự lịch sự, ân cần, ấm áp và thấu cảm sâu sắc trước nỗi đau, sự lo lắng của người bệnh.
- Bắt buộc luôn mở đầu câu trả lời bằng các từ ngữ lễ phép như: "Dạ, em chào anh/chị ạ", "Dạ vâng ạ", "Dạ, em rất chia sẻ với tình trạng của mình ạ".
- Xưng hô nhất quán: "Em" và gọi khách hàng là "anh/chị" hoặc "mình".
- Đưa ra thông tin rõ ràng, rành mạch, có chiều sâu chuyên môn, tuyệt đối không bịa đặt thông tin nằm ngoài vùng dữ liệu thực tế.

NGHỆ THUẬT CHỐT LỊCH HẸN (SALES/BOOKING CONVERSION):
- Mục tiêu tối thượng là hỗ trợ bệnh nhân được gặp bác sĩ giỏi sớm nhất.
- Ở cuối câu trả lời (trừ khi từ chối tư vấn), bắt buộc lồng ghép CTA tinh tế, hướng khách hàng đến việc chốt lịch.
- Không hỏi chung chung. Hãy dùng kỹ thuật giả định đồng ý, khi chưa tư vấn bệnh viện thì hãy hỏi lại: "Mình ở đâu để em hỗ trợ anh/chị tìm kiếm bệnh viện gần nhất ạ?" hoặc là: "Anh/chị muốn tìm bệnh viện nào không ạ". Còn nếu đã tư vấn bệnh viện thì hãy hỏi: "Mình dự định đi khám vào buổi sáng hay buổi chiều để em canh khung giờ vắng khách cho mình ạ?", "Để không phải xếp hàng chờ đợi, em hỗ trợ anh/chị lấy số thứ tự ưu tiên trước luôn nhé?".

QUY TẮC TRÌNH BÀY UI/UX THỊ GIÁC:
- Bắt buộc sử dụng Markdown để in đậm (**Tên Bác sĩ**, **Tên Bệnh viện**, **Chuyên khoa**).
- Sử dụng danh sách (Bullet points) ngắn gọn để liệt kê thông tin.
- Sử dụng Emoji y tế một cách tinh tế làm điểm nhấn (🏥, 👨‍⚕️, 👩‍⚕️, 🩺, 💡, 📍, 💰, ⭐). Không lạm dụng quá đà.
- TUYỆT ĐỐI không hiển thị cú pháp JSON thô ra màn hình của người dùng.
`;

const STRICT_COMPLIANCE = `
RÀNG BUỘC KỸ THUẬT TUYỆT ĐỐI (STRICT COMPLIANCE):
1. KHÔNG ĐƯỢC ẢO GIÁC: Cấm bịa đặt tên Bác sĩ, địa chỉ, số điện thoại hay mức phí không có trong "NGỮ CẢNH DỮ LIỆU THỰC TẾ". Nếu thiếu dữ liệu, thực hiện trung thực theo đúng CHỈ THỊ NHIỆM VỤ.
2. LUÔN TRẢ VỀ JSON CHUẨN: Toàn bộ nội dung trả lời cho khách phải nằm trong key "reply". Trả về chuỗi String JSON nguyên bản, KHÔNG bọc bằng thẻ markdown \`\`\`json.
`;

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================

const formatDateVi = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return isNaN(d.getTime())
    ? ""
    : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const normalizeStr = (str) =>
  str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
    : "";

const buildMemoryInstruction = (lastMetadata) => {
  if (!lastMetadata) return "";
  return `
[BỘ NHỚ NGỮ CẢNH HỘI THOẠI TRƯỚC]:
- Trạng thái/Ngữ cảnh ở câu chat ngay trước đó của khách hàng là: "${lastMetadata}"
- QUAN HỆ MỐI LIÊN KẾT:
  + Quan hệ 1-N (Từ Bệnh viện -> Danh sách Bác sĩ): Nếu câu trước bạn vừa liệt kê bác sĩ của một viện, và câu này khách hỏi tắt (Ví dụ: "Giá khám ông số 1 bao nhiêu?", "Bác sĩ đầu tiên khám ngoài giờ không?"), bạn phải tự động hiểu họ đang chỉ đích danh bác sĩ trong danh sách vừa in ra.
  + Quan hệ N-1 (Từ Bác sĩ -> Bệnh viện/Chuyên khoa): Nếu dữ liệu đầu vào hiện tại bị khuyết do khách nói trống không, hãy sử dụng "Trạng thái trước đó" để bù đắp ngữ cảnh, trả lời liền mạch, không cắt đứt mạch trò chuyện.
`;
};

// ============================================================================
// 3. INTENT HANDLERS (SEPARATION OF CONCERNS)
// ============================================================================

const handlePersonalQuery = (p) => {
  if (!p.userLoggedIn) {
    return {
      dataContext: `❌ YÊU CẦU BẢO MẬT KHÔNG GIAN CÔNG KHAI: Người dùng đang cố gắng truy vấn dữ liệu cá nhân.`,
      taskContext: `NHIỆM VỤ ĐẶC BIỆT (NGẮT MẠCH BẢO MẬT):\n1. Khéo léo từ chối việc cung cấp thông tin trực tiếp trên khung chat này...\n2. CALL-TO-ACTION (CTA) ĐIỀU HƯỚNG: Hướng dẫn chi tiết người dùng: "Nếu anh/chị đã từng đặt lịch hoặc thăm khám trên DOCGO, vui lòng nhấn vào nút **Đăng nhập** ở góc màn hình..."\n3. TUYỆT ĐỐI không chốt lịch hẹn khám ở câu này.`,
      stateSummary: "rejected_personal_login_required",
    };
  }

  const entity = p.personalEntity || "appointments";
  const pData = p.personalData || {};
  const items = pData.items || [];

  if (entity === "appointments") {
    const docFilter = pData.filteredByDoctor || p.filterDoctorName;
    const dateFilter = pData.filteredByDate || p.filterDate;
    const displayDate = formatDateVi(dateFilter);

    if (pData.error === "DOCTOR_NOT_FOUND") {
      return {
        dataContext: `❌ Không tìm thấy bác sĩ có tên "${pData.doctorName}" trong hệ thống.`,
        taskContext: `Thông báo lịch sự rằng chưa tìm thấy bác sĩ này, đề nghị kiểm tra lại tên hoặc cung cấp thêm thông tin. KHÔNG CTA đặt lịch.`,
        stateSummary: "personal_appointments_doctor_not_found",
      };
    }

    if (!items.length) {
      let ctx = "📅 Dữ liệu lịch hẹn của anh/chị: **Không có lịch hẹn nào**.";
      let state = "personal_appointments_empty";
      if (docFilter && dateFilter) {
        ctx = `📅 Dữ liệu lịch hẹn của anh/chị với bác sĩ **${docFilter}** vào ngày **${displayDate}**: **Không có lịch hẹn nào**.`;
        state = `personal_appointments_empty|doctor=${docFilter}|date=${dateFilter}`;
      } else if (dateFilter) {
        ctx = `📅 Dữ liệu lịch hẹn của anh/chị vào ngày **${displayDate}**: **Không có lịch hẹn nào**.`;
        state = `personal_appointments_empty|date=${dateFilter}`;
      } else if (docFilter) {
        ctx = `📅 Dữ liệu lịch hẹn của anh/chị với bác sĩ **${docFilter}**: **Không có lịch hẹn nào**.`;
        state = `personal_appointments_empty|doctor=${docFilter}`;
      }
      return {
        dataContext: ctx,
        taskContext: `Thông báo nhẹ nhàng rằng chưa có lịch hẹn. Hỏi xem có muốn đặt lịch mới không.`,
        stateSummary: state,
      };
    }

    const lines = items
      .map((app, idx) => {
        const timeInfo = app.time ? ` lúc ${app.time}` : "";
        const cancelInfo = app.cancellationReason
          ? ` (Lý do hủy: ${app.cancellationReason})`
          : "";
        let paymentText = "";
        if (app.paymentStatus === "paid")
          paymentText = ` – 💳 Đã thanh toán (${app.paymentMethod === "online" ? "online" : "offline"})`;
        else if (app.paymentStatus === "pending")
          paymentText = ` – 💳 Chưa thanh toán (${app.paymentMethod === "online" ? "chờ chuyển khoản" : "thanh toán tại quầy"})`;
        else if (app.paymentStatus === "failed")
          paymentText = ` – 💳 Thanh toán thất bại`;

        return `${idx + 1}. 📅 **${app.date}**${timeInfo} – 👨‍⚕️ **${app.doctorName}** (${app.specialty || "Chuyên khoa chung"}) – 🏥 ${app.clinicName} – **${app.statusText}**${cancelInfo}${paymentText}`;
      })
      .join("\n");

    const title =
      docFilter && dateFilter
        ? `DANH SÁCH LỊCH HẸN VỚI **BÁC SĨ ${docFilter}** NGÀY **${displayDate}**`
        : docFilter
          ? `DANH SÁCH LỊCH HẸN VỚI **BÁC SĨ ${docFilter}**`
          : dateFilter
            ? `DANH SÁCH LỊCH HẸN NGÀY **${displayDate}**`
            : `DANH SÁCH LỊCH HẸN CỦA ANH/CHỊ`;

    return {
      dataContext: `📅 ${title} (${items.length} lịch):\n${lines}`,
      taskContext: `Trình bày danh sách lịch hẹn rõ ràng. Kết thúc bằng câu hỏi: "Anh/chị muốn xem chi tiết lịch hẹn nào không ạ? Hoặc đặt thêm lịch mới?"`,
      stateSummary: `personal_appointments${docFilter ? "|doctor=" + docFilter : ""}|date=${dateFilter || ""}|count=${items.length}`,
    };
  }

  if (entity === "prescriptions") {
    const displayDate = formatDateVi(p.filterDate);
    if (!items.length) {
      return {
        dataContext: displayDate
          ? `📋 Anh/chị không có đơn thuốc nào vào ngày **${displayDate}**.`
          : `📋 Anh/chị chưa có đơn thuốc nào trong hệ thống.`,
        taskContext: `Thông báo nhẹ nhàng rằng chưa có đơn thuốc. Hỏi xem có muốn đặt lịch khám để được bác sĩ kê đơn không.`,
        stateSummary: displayDate
          ? `personal_prescriptions_empty|date=${p.filterDate}`
          : "personal_prescriptions_empty",
      };
    }
    const lines = items
      .map((pres, idx) => {
        const followUpStr = pres.followUpDate
          ? `\n   - 🔔 **Tái khám:** ${formatDateVi(pres.followUpDate)}`
          : "";
        return `${idx + 1}. 🩺 **Ngày ${formatDateVi(pres.date) || "Không rõ"}** – 👨‍⚕️ **BS ${pres.doctorName}** (${pres.specialtyName})\n   - **Chẩn đoán:** ${pres.diagnosis}\n   - **Đơn thuốc:**\n     ${pres.prescriptionText}\n   - **Lời dặn:** ${pres.instructions || "Không có"}${followUpStr}`;
      })
      .join("\n\n");
    return {
      dataContext: `📋 **DANH SÁCH ĐƠN THUỐC CỦA ANH/CHỊ** (${items.length} đơn):\n\n${lines}`,
      taskContext: `Sau khi hiển thị danh sách, hỏi thêm: "Anh/chị muốn xem chi tiết đơn thuốc nào hoặc cần em hỗ trợ đặt lịch tái khám không ạ?"`,
      stateSummary: `personal_prescriptions|date=${p.filterDate || ""}|count=${items.length}`,
    };
  }

  if (entity === "records") {
    if (!items.length)
      return {
        dataContext: `📋 Anh/chị chưa có hồ sơ bệnh án nào.`,
        taskContext: `Thông báo nhẹ nhàng và khuyến khích tạo hồ sơ.`,
        stateSummary: "personal_records_empty",
      };
    const lines = items
      .map(
        (rec, idx) =>
          `${idx + 1}. 👤 **${rec.fullName}**${rec.isDefault ? " (Mặc định)" : ""}\n   - 📅 Ngày sinh: ${formatDateVi(rec.dateOfBirth) || "Chưa rõ"} (${rec.gender})\n   - 📞 Điện thoại: ${rec.phone}\n   - 🆔 CCCD: ${rec.cccd}\n   - 🏠 Địa chỉ: ${rec.address}\n   - 🩸 Nhóm máu: ${rec.bloodGroup}\n   - 💊 Dị ứng: ${rec.allergies}\n   - 🏥 Bảo hiểm: ${rec.insurance}`,
      )
      .join("\n\n");
    return {
      dataContext: `📋 **DANH SÁCH HỒ SƠ BỆNH ÁN CỦA ANH/CHỊ** (${items.length} hồ sơ):\n\n${lines}`,
      taskContext: `Sau khi hiển thị danh sách, hỏi thêm: "Anh/chị muốn cập nhật hồ sơ nào hoặc thêm hồ sơ mới không ạ?"`,
      stateSummary: `personal_records|count=${items.length}`,
    };
  }

  return {
    dataContext: `❌ Chức năng cho ${entity} đang được phát triển.`,
    taskContext: `Thông báo chưa hỗ trợ, xin lỗi và đề nghị quay lại sau.`,
    stateSummary: "personal_unsupported",
  };
};

const handleClinicDoctorCheck = (p) => {
  if (!p.doctorInfo || !p.clinicInfo) {
    return {
      dataContext: `❌ KẾT QUẢ TRA CỨU: Không tìm thấy đầy đủ dữ liệu bác sĩ hoặc bệnh viện để đối chiếu.`,
      taskContext: `NHIỆM VỤ: Xin lỗi vì tên nhập vào còn mơ hồ. Đề nghị viết rõ đầy đủ tên bác sĩ và cơ sở y tế.`,
      stateSummary: "check_doc_clinic_missing_info",
    };
  }
  const doctorClinic = normalizeStr(p.doctorInfo.clinicName);
  const targetClinic = normalizeStr(p.clinicInfo.clinicName);

  const belongs =
    p.intent === "doctor_in_clinic"
      ? doctorClinic &&
        (doctorClinic === targetClinic ||
          doctorClinic.includes(targetClinic) ||
          targetClinic.includes(doctorClinic))
      : p.doctorsInClinic?.some((d) =>
          d.fullName
            .toLowerCase()
            .includes(p.doctorInfo.fullName.toLowerCase()),
        ) || false;

  if (belongs) {
    return {
      dataContext: `✅ KẾT QUẢ TRA CỨU: **Bác sĩ ${p.doctorInfo.fullName}** HIỆN ĐANG công tác tại **Bệnh viện/Phòng khám ${p.clinicInfo.clinicName}**.`,
      taskContext: `NHIỆM VỤ: Xác nhận thông tin chính xác. Chốt lịch ngay bằng cách hỏi: "Anh/chị dự định qua viện ngày nào để em đăng ký khung giờ vắng ạ?".`,
      stateSummary: `check_doc_clinic|yes|doc=${p.doctorInfo.fullName}|clinic=${p.clinicInfo.clinicName}`,
    };
  }
  const suggestion = p.doctorsInClinic?.length
    ? `\nTuy nhiên, cơ sở này đang có các bác sĩ giỏi khác: ${p.doctorsInClinic
        .slice(0, 3)
        .map((d) => d.fullName)
        .join(", ")}`
    : "";
  return {
    dataContext: `❌ KẾT QUẢ TRA CỨU: **Bác sĩ ${p.doctorInfo.fullName}** hiện KHÔNG công tác tại **Bệnh viện ${p.clinicInfo.clinicName}**.${suggestion}`,
    taskContext: `NHIỆM VỤ: Thông báo rõ ràng. Thực hiện điều hướng thông minh: Hỏi khách ưu tiên khám tại Bệnh viện này hay quyết tâm theo Bác sĩ này.`,
    stateSummary: `check_doc_clinic|no|doc=${p.doctorInfo.fullName}|clinic=${p.clinicInfo.clinicName}`,
  };
};

const getContextAndTask = (p) => {
  switch (p.intent) {
    case "off_topic":
      return {
        dataContext: `❌ YÊU CẦU NGOÀI PHẠM VI: Chủ đề ngoài lề y tế con người.`,
        taskContext: `Từ chối lịch sự, thông báo DOCGO chỉ hỗ trợ y tế CON NGƯỜI. Không CTA.`,
        stateSummary: "rejected_off_topic",
      };
    case "prescription_request":
      return {
        dataContext: `❌ YÊU CẦU PHẠM QUY: Yêu cầu kê đơn/mua bán thuốc online.`,
        taskContext: `Từ chối khéo léo theo quy định Bộ Y tế. Hướng dẫn đến viện khám trực tiếp. CTA mời đặt lịch.`,
        stateSummary: "rejected_prescription",
      };
    case "personal_query":
      return handlePersonalQuery(p);
    case "booking_request": {
      const docHint =
        p.targetDoctorInfo?.fullName ||
        p.lastMetadata?.match(/doctor=([^|]+)/)?.[1] ||
        null;
      return {
        dataContext: `✅ YÊU CẦU ĐẶT LỊCH KHÁM\n- Đối tượng: ${docHint ? `Bác sĩ ${docHint}` : "Chưa xác định"}`,
        taskContext: `Hướng dẫn từng bước đặt lịch khám trên hệ thống. 1. Đăng nhập/Đăng ký. 2. Tìm bác sĩ. 3. Đặt lịch. Hỏi "Anh/chị đã có tài khoản DOCGO chưa ạ?"`,
        stateSummary: `booking_guide|doctor=${docHint || "none"}`,
      };
    }
    case "find_doctors_by_clinic_specialty": {
      if (!p.clinicInfo || !p.specialtyDoctorsList)
        return {
          dataContext: `❌ KẾT QUẢ TRA CỨU: Không tìm thấy thông tin bệnh viện/chuyên khoa.`,
          taskContext: `Xin lỗi nhẹ nhàng, chủ động hỏi lại thông tin chính xác.`,
          stateSummary: "missing_data",
        };
      if (!p.specialtyDoctorsList.length)
        return {
          dataContext: `❌ KẾT QUẢ TRA CỨU: Bệnh viện ${p.clinicInfo.clinicName} - Khoa ${p.clinicInfo.specialtyName || "đã chọn"} chưa có hồ sơ bác sĩ active.`,
          taskContext: `Thông báo khéo léo lịch đang cập nhật, gợi ý đổi cơ sở khác.`,
          stateSummary: `find_doctors_by_clinic_specialty|clinic=${p.clinicInfo.clinicName}|status=no_doctors`,
        };
      const lines = p.specialtyDoctorsList
        .map(
          (doc, idx) =>
            `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🩺 Chuyên môn: ${doc.experience ? doc.experience + " năm" : "Dày dặn"}\n   - 💰 Phí khám: ${doc.consultationFee ? doc.consultationFee.toLocaleString("vi-VN") + " VNĐ" : "Liên hệ"}\n   - ⭐ Uy tín: ${doc.avgRating ? doc.avgRating.toFixed(1) + "/5" : "Chưa có"}`,
        )
        .join("\n\n");
      return {
        dataContext: `✅ KẾT QUẢ TRA CỨU: **Bệnh viện ${p.clinicInfo.clinicName}** - Khoa **${p.clinicInfo.specialtyName || "đã chọn"}**\nDanh sách bác sĩ:\n${lines}`,
        taskContext: `Giới thiệu danh sách bác sĩ với sự tự hào. Mời chọn bác sĩ để lấy mã khám.`,
        stateSummary: `find_doctors_by_clinic_specialty|clinic=${p.clinicInfo.clinicName}`,
      };
    }

    case "find_doctors_by_specialty": {
      // Ngoại lệ 1: Nhập sai tên chuyên khoa
      if (p.specialtyCheckResult?.found === false) {
        return {
          dataContext: `❌ KHÔNG TÌM THẤY: Hệ thống DOCGO không ghi nhận chuyên khoa "${p.specialtyCheckResult.querySpecialtyName}".`,
          taskContext: `1. Xin lỗi nhẹ nhàng vì không tìm thấy chuyên khoa này.\n2. TỰ ĐỘNG tra cứu [DANH SÁCH TOÀN BỘ CHUYÊN KHOA] ở đầu hướng dẫn, tìm ra 3 chuyên khoa có tên hoặc ý nghĩa gần giống nhất để gợi ý cho khách hàng.\n3. Hỏi khách hàng đang gặp triệu chứng gì để hỗ trợ chính xác hơn.`,
          stateSummary: `find_doctors_by_specialty|not_found|query=${p.specialtyCheckResult.querySpecialtyName}`,
        };
      }

      const docData = p.specialtyDoctorsList;
      // Ngoại lệ 2: Có khoa nhưng 0 bác sĩ
      if (!docData || docData.totalCount === 0) {
        return {
          dataContext: `⚠️ DANH SÁCH BÁC SĨ: Khoa **${p.specialtyCheckResult?.specialty?.name}** hiện chưa có hồ sơ bác sĩ nào ở trạng thái hoạt động (active).`,
          taskContext: `Thông báo khéo léo rằng hệ thống đang cập nhật hồ sơ bác sĩ cho khoa này. Hỏi thăm triệu chứng bệnh lý để gợi ý một chuyên khoa khác uy tín thay thế.`,
          stateSummary: `find_doctors_by_specialty|no_doctors|spec=${p.specialtyCheckResult?.specialty?.name}`,
        };
      }

      // Luồng chuẩn: Liệt kê tối đa 10 bác sĩ (Đã xóa bỏ toàn bộ Log Debug)
      const { totalCount, topDoctors } = docData;
      const docLines = topDoctors
        .map((doc, idx) => {
          // Biến doc.totalReviews hiện tại đã được bảo vệ tuyệt đối là 1 con số (>= 0)
          const ratingText =
            doc.totalReviews > 0
              ? `${Number(doc.avgRating).toFixed(1)}/5 (${doc.totalReviews} lượt đánh giá)`
              : "Chưa có đánh giá";

          return `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🏥 Nơi công tác: ${doc.clinicName}\n   - 🩺 Kinh nghiệm: ${doc.experience ? doc.experience + " năm" : "Dày dặn"}\n   - ⭐ Uy tín: ${ratingText}`;
        })
        .join("\n\n");

      return {
        dataContext: `✅ DANH SÁCH BÁC SĨ: **Khoa ${p.specialtyCheckResult.specialty.name}**\n- Tổng số lượng bác sĩ trên toàn hệ thống: **${totalCount} bác sĩ**.\n- Danh sách nổi bật (tối đa 10 người):\n${docLines}`,
        taskContext: `1. Thông báo đầy tự hào tổng số lượng bác sĩ của chuyên khoa này hiện có trên hệ thống.\n2. Trình bày danh sách các bác sĩ nổi bật.\n3. Nếu tổng số > 10, nhắc nhẹ rằng "Dạ trên đây là 10 bác sĩ tiêu biểu nhất...".\n4. CHỐT SALE (CTA): Hỏi khách muốn đặt lịch với bác sĩ nào, hoặc khách đang ở khu vực nào để em lọc bệnh viện gần nhất.`,
        stateSummary: `find_doctors_by_specialty|found|spec=${p.specialtyCheckResult.specialty.name}|total=${totalCount}`,
      };
    }

    case "doctor_specialty":
      if (p.doctorInfo?.specialty)
        return {
          dataContext: `✅ KẾT QUẢ TRA CỨU: **Bác sĩ ${p.doctorInfo.fullName}** thuộc **Khoa ${p.doctorInfo.specialty.name}**.`,
          taskContext: `Thông báo khoa. Hỏi thăm tình trạng sức khỏe để sắp xếp lịch.`,
          stateSummary: `doctor_specialty|doctor=${p.doctorInfo.fullName}`,
        };
      if (p.doctorInfo)
        return {
          dataContext: `❌ Tìm thấy **Bác sĩ ${p.doctorInfo.fullName}** nhưng chưa cập nhật chuyên khoa.`,
          taskContext: `Báo cáo trung thực, hỏi thăm cần khám bệnh lý gì.`,
          stateSummary: "doctor_specialty_no_data",
        };
      return {
        dataContext: `❌ Không tìm thấy bác sĩ nào trùng khớp.`,
        taskContext: `Thông báo không tìm thấy, nhắc kiểm tra tên hoặc cung cấp triệu chứng.`,
        stateSummary: "doctor_specialty_not_found",
      };
    case "doctor_in_clinic":
    case "clinic_has_doctor":
      return handleClinicDoctorCheck(p);
    case "doctor_fee":
      if (p.doctorInfo)
        return {
          dataContext: `✅ KẾT QUẢ TRA CỨU: **Bác sĩ ${p.doctorInfo.fullName}** | Phí khám: **${p.doctorInfo.consultationFee ? p.doctorInfo.consultationFee.toLocaleString("vi-VN") + " VNĐ" : "Chưa cập nhật"}**.`,
          taskContext: `Thông báo chi phí minh bạch. Hỏi xem có muốn đặt lịch luôn không.`,
          stateSummary: `doctor_fee|doctor=${p.doctorInfo.fullName}`,
        };
      return {
        dataContext: `❌ Không tìm thấy bác sĩ này để tra cứu giá.`,
        taskContext: `Báo cáo không tìm thấy, đề xuất tìm kiếm giá khám chung.`,
        stateSummary: "doctor_fee_not_found",
      };
    case "doctor_info":
      if (p.doctorInfo)
        return {
          dataContext: `✅ KẾT QUẢ HỒ SƠ BÁC SĨ:\n- 👨‍⚕️ **Họ và tên**: Bác sĩ ${p.doctorInfo.fullName}\n- 🩺 **Chuyên khoa**: ${p.doctorInfo.specialty?.name || "Đang cập nhật"}\n- 🏥 **Nơi công tác**: ${p.doctorInfo.clinicName || "Đang cập nhật"}\n- 📝 **Giới thiệu**: ${p.doctorInfo.bio || "Bác sĩ có chuyên môn sâu."}`,
          taskContext: `Giới thiệu bác sĩ như một danh thiếp chuyên nghiệp. Chốt sale đặt lịch.`,
          stateSummary: `doctor_info|doctor=${p.doctorInfo.fullName}`,
        };
      return {
        dataContext: `❌ Không tìm thấy bác sĩ theo từ khóa này.`,
        taskContext: `Báo hệ thống chưa liên kết, đề nghị cung cấp triệu chứng thay thế.`,
        stateSummary: "doctor_info_not_found",
      };
    case "check_specialty_in_clinic":
      if (p.specialtyCheckResult?.hasSpecialty)
        return {
          dataContext: `✅ KẾT QUẢ TRA CỨU: **Bệnh viện ${p.specialtyCheckResult.clinic.clinicName}** CÓ **Khoa ${p.specialtyCheckResult.specialty.name}**.`,
          taskContext: `Xác nhận thông tin. Hỏi thăm có biểu hiện gì bất thường cần gặp bác sĩ không.`,
          stateSummary: `specialty_check|has|clinic=${p.specialtyCheckResult.clinic.clinicName}`,
        };
      if (p.specialtyCheckResult?.found)
        return {
          dataContext: `❌ KẾT QUẢ TRA CỨU: **Bệnh viện ${p.specialtyCheckResult.clinic.clinicName}** KHÔNG CÓ **Khoa ${p.specialtyCheckResult.specialty.name}**.`,
          taskContext: `Thông báo không có. Hỏi muốn đổi khoa hay đổi viện.`,
          stateSummary: `specialty_check|not_has|clinic=${p.specialtyCheckResult.clinic.clinicName}`,
        };
      return {
        dataContext: `❌ Không tìm thấy bệnh viện hoặc chuyên khoa.`,
        taskContext: `Báo lỗi dữ liệu, hướng dẫn cung cấp lại tên chính xác.`,
        stateSummary: "specialty_check|error",
      };
    case "check_hospital_existence":
      if (p.existenceResult?.found)
        return {
          dataContext: `✅ KẾT QUẢ TRA CỨU: **Cơ sở ${p.existenceResult.clinic.clinicName}** ĐÃ ĐƯỢC XÁC THỰC.\n- 📍 Địa chỉ: ${p.existenceResult.clinic.address}`,
          taskContext: `Xác nhận tồn tại. Đưa CTA: "Anh/chị cần đặt lịch khám tại đây đúng không ạ?".`,
          stateSummary: `check_existence|found|clinic=${p.existenceResult.clinic.clinicName}`,
        };
      return {
        dataContext: `❌ DOCGO chưa ghi nhận cơ sở "${p.existenceResult?.queryName || "đã nhập"}".`,
        taskContext: `Thông báo chưa có dữ liệu. Kéo khách vào luồng chốt sale mở theo khu vực.`,
        stateSummary: "check_existence|not_found",
      };

    // ========================================================================
    // LOGIC CHẨN ĐOÁN & CHUYÊN KHOA CHO NHÁNH DEFAULT
    // ========================================================================
    default: {
      if (p.hospitals?.length) {
        const hospitalData = p.hospitals
          .map((h) => `🏥 **${h.clinicName}**\n📍 Địa chỉ: ${h.address}`)
          .join("\n\n");
        return {
          dataContext: `✅ DỮ LIỆU HỆ THỐNG:\n- Khu vực: ${p.userLoc || "Gần bạn"}\n\nCơ sở y tế khả dụng gần nhất:\n${hospitalData}`,
          taskContext: `1. Thấu cảm: Lắng nghe, thấu cảm sâu sắc với tình trạng sức khỏe.\n2. Bắt bệnh: Đọc/Dự đoán sơ bộ xem với triệu chứng đó, khả năng cao bệnh nhân đang gặp vấn đề/bệnh lý gì.\n3. Chỉ định chuyên khoa: Tự động đề xuất 1 đến tối đa 3 chuyên khoa phù hợp nhất để đi khám. BẮT BUỘC chỉ được lấy tên chuyên khoa nằm trong [DANH SÁCH TOÀN BỘ CHUYÊN KHOA] đã cung cấp ở trên, tuyệt đối không bịa tên chuyên khoa ngoài danh sách.\n4. Giới thiệu trang trọng danh sách bệnh viện khả dụng ở trên.\n5. CHỐT SALE (CTA): Hỏi khách muốn lựa chọn cơ sở nào để lấy số thứ tự ưu tiên.`,
          stateSummary: `general_consultation|loc=${p.userLoc || "none"}|found=yes`,
        };
      }
      return {
        dataContext: `❌ DỮ LIỆU HỆ THỐNG:\n- Khu vực: ${p.userLoc || "Chưa xác định"}\n- Cơ sở gần nhất: Trống dữ liệu.`,
        taskContext: `1. Thấu cảm: Lắng nghe, thấu cảm sâu sắc với tình trạng sức khỏe.\n2. Bắt bệnh: Đọc/Dự đoán sơ bộ xem với triệu chứng đó, khả năng cao bệnh nhân đang gặp vấn đề/bệnh lý gì.\n3. Chỉ định chuyên khoa: Tự động đề xuất 1 đến tối đa 3 chuyên khoa phù hợp nhất để đi khám. BẮT BUỘC chỉ được lấy tên chuyên khoa nằm trong [DANH SÁCH TOÀN BỘ CHUYÊN KHOA] đã cung cấp ở trên, tuyệt đối không bịa tên chuyên khoa ngoài danh sách.\n4. ĐIỀU HƯỚNG: Khéo léo hỏi Quận/Huyện, Tỉnh thành khách đang ở để tìm cơ sở y tế gần nhất.`,
        stateSummary: `general_consultation|loc=${p.userLoc || "none"}|found=no`,
      };
    }
  }
};

// ============================================================================
// 4. MAIN BUILDER EXPORT
// ============================================================================

export const buildAdaptivePrompt = (params) => {
  const { specialties, lastMetadata } = params;

  const memoryInstruction = buildMemoryInstruction(lastMetadata);
  const { dataContext, taskContext, stateSummary } = getContextAndTask(params);
  const specList = specialties.map((s) => `- ${s.name}`).join("\n");

  return `${BASE_PERSONA}
==============================================================================
DANH SÁCH TOÀN BỘ CHUYÊN KHOA HỆ THỐNG HỖ TRỢ (THAM KHẢO PHÂN LOẠI BỆNH):
${specList}
==============================================================================${memoryInstruction}
==============================================================================
NGỮ CẢNH DỮ LIỆU THỰC TẾ (CHỈ ĐƯỢC DÙNG DATA NÀY):
${dataContext}
==============================================================================
CHỈ THỊ NHIỆM VỤ CỤ THỂ:
${taskContext}
==============================================================================
${STRICT_COMPLIANCE}

ĐỊNH DẠNG JSON ĐẦU RA BẮT BUỘC:
{
  "reply": "Nội dung câu trả lời hoàn chỉnh, trình bày Markdown đẹp và kết bằng câu hỏi CTA (trừ trường hợp từ chối tư vấn ngoại lệ).",
  "state_summary": "${stateSummary}"
}`;
};
