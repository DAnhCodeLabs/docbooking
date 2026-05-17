/**
 * MODULE: CHAT PROMPT BUILDER (PRODUCTION VERSION)
 * LAYER: Presentation / Prompt Engineering
 * ROLE: Xây dựng System Instruction tối ưu, kết hợp mã hóa mối quan hệ dữ liệu (State Machine),
 * kịch bản tư vấn y tế chuyên sâu, chốt lịch khám (CTA) và rào chắn nghiệp vụ (Boundary Violations).
 */

export const buildAdaptivePrompt = ({
  specialties,
  hospitals,
  userLoc,
  currentSpec,
  intent,
  lastMetadata,
  existenceResult,
  specialtyCheckResult,
  doctorInfo,
  clinicInfo,
  doctorsInClinic,
  specialtyDoctorsList,
  bookingRequest,
  targetDoctorInfo,
}) => {
  // ==========================================================================
  // 1. ĐỊNH NGHĨA NHÂN VẬT CHUYÊN GIA & GIỌNG VĂN CHUẨN Y KHOA (GLOBAL PERSONA)
  // ==========================================================================
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

  // ==========================================================================
  // 2. KHỐI QUẢN LÝ QUAN HỆ NGỮ CẢNH (CONTEXT CHAINING & STATE MACHINE)
  // ==========================================================================
  let memoryInstruction = "";
  if (lastMetadata) {
    memoryInstruction = `
[BỘ NHỚ NGỮ CẢNH HỘI THOẠI TRƯỚC]:
- Trạng thái/Ngữ cảnh ở câu chat ngay trước đó của khách hàng là: "${lastMetadata}"
- QUAN HỆ MỐI LIÊN KẾT:
  + Quan hệ 1-N (Từ Bệnh viện -> Danh sách Bác sĩ): Nếu câu trước bạn vừa liệt kê bác sĩ của một viện, và câu này khách hỏi tắt (Ví dụ: "Giá khám ông số 1 bao nhiêu?", "Bác sĩ đầu tiên khám ngoài giờ không?"), bạn phải tự động hiểu họ đang chỉ đích danh bác sĩ trong danh sách vừa in ra.
  + Quan hệ N-1 (Từ Bác sĩ -> Bệnh viện/Chuyên khoa): Nếu dữ liệu đầu vào hiện tại bị khuyết do khách nói trống không, hãy sử dụng "Trạng thái trước đó" để bù đắp ngữ cảnh, trả lời liền mạch, không cắt đứt mạch trò chuyện.
`;
  }

  let dataContext = "";
  let taskContext = "";
  let stateSummary = "general_conversation";

  // ==========================================================================
  // 3. LỚP PHÒNG NGỰ RANH GIỚI NGHIỆP VỤ (BOUNDARY VIOLATIONS)
  // ==========================================================================

  if (intent === "off_topic") {
    dataContext = `❌ YÊU CẦU NGOÀI PHẠM VI: Người dùng đang hỏi về động vật, thú cưng, thú y, hoặc các chủ đề ngoài lề không thuộc lĩnh vực y tế con người.`;
    taskContext = `NHIỆM VỤ ĐẶC BIỆT: Lịch sự từ chối tư vấn. Phải thông báo rõ ràng rằng nền tảng DOCGO chỉ chuyên hỗ trợ y tế và đặt lịch khám cho **CON NGƯỜI**. Hướng dẫn họ đưa thú cưng đến các trạm thú y. TUYỆT ĐỐI KHÔNG ân cần hỏi thêm triệu chứng hay kêu gọi đặt lịch (CTA) tại bệnh viện cho ca này.`;
    stateSummary = "rejected_off_topic";
  } else if (intent === "prescription_request") {
    dataContext = `❌ YÊU CẦU PHẠM QUY: Người dùng đang yêu cầu kê đơn thuốc, mua bán thuốc trực tuyến.`;
    taskContext = `NHIỆM VỤ ĐẶC BIỆT: Từ chối khéo léo. Giải thích theo quy định của Bộ Y tế, chuyên viên/hệ thống không được phép kê đơn thuốc hoặc chỉ định liều lượng qua mạng khi chưa thăm khám trực tiếp. Hướng dẫn họ đến viện để bác sĩ chẩn đoán. Có thể dùng CTA mời đặt lịch khám trực tiếp.`;
    stateSummary = "rejected_prescription";
  } else if (intent === "personal_query") {
    dataContext = `❌ YÊU CẦU BẢO MẬT KHÔNG GIAN CÔNG KHAI: Người dùng đang cố gắng truy vấn dữ liệu cá nhân (lịch sử khám, thông tin cá nhân, đơn thuốc, lịch hẹn, v.v.).`;

    taskContext = `NHIỆM VỤ ĐẶC BIỆT (NGẮT MẠCH BẢO MẬT):
1. Khéo léo từ chối việc cung cấp thông tin trực tiếp trên khung chat này. Giải thích rằng để bảo vệ quyền riêng tư và bảo mật y tế tuyệt đối cho khách hàng, hệ thống DOCGO không hiển thị hồ sơ cá nhân tại khung tư vấn mở.
2. CALL-TO-ACTION (CTA) ĐIỀU HƯỚNG: Hướng dẫn chi tiết người dùng: "Nếu anh/chị đã từng đặt lịch hoặc thăm khám trên DOCGO, vui lòng nhấn vào nút **Đăng nhập** ở góc màn hình, sau đó truy cập mục **Hồ sơ cá nhân** hoặc **Lịch sử khám** để xem chi tiết ạ."
3. TUYỆT ĐỐI không chốt lịch hẹn khám ở câu này, chỉ tập trung giải quyết vấn đề đăng nhập.`;

    stateSummary = "rejected_personal_login_required";
  }
  // ======================== INTENT MỚI: ĐẶT LỊCH KHÁM ========================
  else if (intent === "booking_request") {
    const doctorNameHint =
      targetDoctorInfo?.fullName ||
      lastMetadata?.match(/doctor=([^|]+)/)?.[1] ||
      null;
    const hasContext = !!doctorNameHint;

    dataContext = `✅ YÊU CẦU ĐẶT LỊCH KHÁM
- Người dùng muốn đặt lịch khám.
- ${doctorNameHint ? `Đối tượng: Bác sĩ ${doctorNameHint}` : "Chưa xác định bác sĩ cụ thể."}
- ${hasContext ? "Đã có bối cảnh tư vấn trước đó (có thể đã giới thiệu bác sĩ/bệnh viện)." : "Chưa có bối cảnh tư vấn trước."}`;

    taskContext = `NHIỆM VỤ: Hướng dẫn người dùng từng bước để đặt lịch khám trên hệ thống DOCGO.

**Luồng hướng dẫn chi tiết (xuất ra bằng Markdown, có thể tùy biến theo bối cảnh):**

1. Nếu có thông tin bác sĩ (${doctorNameHint ? `bác sĩ ${doctorNameHint}` : "chưa rõ"}):
   - Nhấn mạnh: "Dạ, anh/chị muốn đặt lịch với bác sĩ [tên] – rất tuyệt vời ạ."
   - Hỏi xác nhận lại: "Anh/chị xác nhận đúng bác sĩ này phải không ạ?"

2. Hướng dẫn đăng nhập / đăng ký:
   - Nếu đã có tài khoản: "Vui lòng **đăng nhập** bằng nút 'Đăng nhập' góc trên cùng màn hình."
   - Nếu chưa có tài khoản: "Anh/chị có thể **đăng ký** ngay bằng email hoặc số điện thoại, chỉ mất 1 phút ạ."

3. Sau khi đăng nhập:
   - "Vào mục **Bác sĩ** (Doctor) trên thanh menu."
   - Tìm kiếm bác sĩ mong muốn (có thể gợi ý tên nếu đã biết).
   - Nhấn vào hồ sơ bác sĩ, chọn **Đặt lịch**.
   - Làm theo hướng dẫn trên màn hình (chọn ngày giờ, xác nhận thông tin).

4. Nhấn mạnh hỗ trợ:
   - "Nếu gặp khó khăn, anh/chị có thể quay lại đây hỏi em nhé."

**CTA kết thúc:** Hỏi "Anh/chị đã có tài khoản DOCGO chưa ạ?" để định hướng bước tiếp theo.

${hasContext ? "**Đặc biệt:** Vì trước đó em đã tư vấn về bác sĩ/bệnh viện này, anh/chị có thể đặt lịch ngay với đúng bác sĩ đó sau khi đăng nhập." : ""}`;

    stateSummary = `booking_guide|doctor=${doctorNameHint || "none"}`;
  }
  // ==========================================================================
  // 4. PHÂN TÍCH LOGIC CHI TIẾT THEO TỪNG INTENT TRUY VẤN (các intent cũ)
  // ==========================================================================
  else if (intent === "find_doctors_by_clinic_specialty") {
    if (!clinicInfo || specialtyDoctorsList === null) {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Hệ thống không tìm thấy thông tin bệnh viện hoặc chuyên khoa này trong cơ sở dữ liệu.`;
      taskContext = `NHIỆM VỤ: Nhẹ nhàng xin lỗi vì chưa nhận diện được địa điểm hoặc chuyên khoa. Chủ động hỏi lại xem anh/chị đang muốn tìm bác sĩ tại bệnh viện cụ thể nào, hoặc thuộc khoa nào để em tra cứu chính xác luồng dữ liệu cho mình.`;
      stateSummary = "missing_data";
    } else if (specialtyDoctorsList.length === 0) {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Tại **Bệnh viện ${clinicInfo.clinicName}**, hiện tại danh mục **Chuyên khoa ${clinicInfo.specialtyName || "đã chọn"}** chưa có hồ sơ bác sĩ nào ở trạng thái kích hoạt (active).`;
      taskContext = `NHIỆM VỤ: Thông báo khéo léo lịch công tác khoa này đang cập nhật. Gợi ý giới thiệu cho họ các bệnh viện đối tác có chuyên khoa tương đương uy tín ở gần đó, hoặc hỏi họ có muốn đổi sang cơ sở khác không.`;
      stateSummary = `find_doctors_by_clinic_specialty|clinic=${clinicInfo.clinicName}|status=no_doctors`;
    } else {
      const doctorListText = specialtyDoctorsList
        .map((doc, idx) => {
          const ratingText = doc.avgRating
            ? `${doc.avgRating.toFixed(1)}/5 (${doc.totalReviews} lượt đánh giá)`
            : "Chưa có lượt đánh giá";
          const feeText = doc.consultationFee
            ? `${doc.consultationFee.toLocaleString("vi-VN")} VNĐ`
            : "Liên hệ lễ tân";
          const expText = doc.experience
            ? `${doc.experience} năm kinh nghiệm`
            : "Chuyên môn dày dặn";
          return `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🩺 Chuyên môn: ${expText}\n   - 💰 Phí khám: ${feeText}\n   - ⭐ Uy tín: ${ratingText}`;
        })
        .join("\n\n");

      dataContext = `✅ KẾT QUẢ TRA CỨU: **Bệnh viện ${clinicInfo.clinicName}** - Khoa **${clinicInfo.specialtyName || "đã chọn"}**\nDanh sách bác sĩ khả dụng:\n${doctorListText}`;
      taskContext = `NHIỆM VỤ: Giới thiệu danh sách bác sĩ này với sự tự hào (VD: "Dạ, tại viện này bên em đang liên kết với các bác sĩ rất mát tay..."). Phân tích nhanh điểm mạnh của bác sĩ nổi bật nhất. Kết câu mời chọn một bác sĩ cụ thể để em hỗ trợ lấy mã khám ưu tiên.`;
      stateSummary = `find_doctors_by_clinic_specialty|clinic=${clinicInfo.clinicName}`;
    }
  } else if (intent === "doctor_specialty") {
    if (doctorInfo?.specialty) {
      dataContext = `✅ KẾT QUẢ TRA CỨU: **Bác sĩ ${doctorInfo.fullName}** đang chuyên trách tại **Khoa ${doctorInfo.specialty.name || "chưa cập nhật"}**.`;
      taskContext = `NHIỆM VỤ: Thông báo chuyên khoa của bác sĩ. Hỏi thăm tình trạng sức khỏe liên quan đến chuyên khoa này để tư vấn thêm và sắp xếp lịch hẹn sớm nhất.`;
      stateSummary = `doctor_specialty|doctor=${doctorInfo.fullName}`;
    } else if (doctorInfo && !doctorInfo.specialty) {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Tìm thấy hồ sơ **Bác sĩ ${doctorInfo.fullName}** nhưng danh mục chuyên khoa chưa cập nhật.`;
      taskContext = `NHIỆM VỤ: Báo cáo trung thực thông tin chưa cập nhật kèm lời xin lỗi. Hỏi thăm mình đang cần khám bệnh lý gì để tìm các bác sĩ đầu ngành khác hỗ trợ.`;
      stateSummary = "doctor_specialty_no_data";
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Không tìm thấy bác sĩ nào trùng khớp trong hệ thống DOCGO.`;
      taskContext = `NHIỆM VỤ: Nhẹ nhàng thông báo không tìm thấy. Nhắc khách hàng kiểm tra lại họ tên, hoặc mời họ cung cấp triệu chứng để hệ thống đề xuất bác sĩ phù hợp thay thế.`;
      stateSummary = "doctor_specialty_not_found";
    }
  } else if (intent === "doctor_in_clinic" || intent === "clinic_has_doctor") {
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
      let belongs = false;

      if (intent === "doctor_in_clinic") {
        belongs =
          doctorClinic &&
          (doctorClinic === targetClinic ||
            doctorClinic.includes(targetClinic) ||
            targetClinic.includes(doctorClinic));
      } else {
        belongs = doctorsInClinic
          ? doctorsInClinic.some((d) =>
              d.fullName
                .toLowerCase()
                .includes(doctorInfo.fullName.toLowerCase()),
            )
          : false;
      }

      if (belongs) {
        dataContext = `✅ KẾT QUẢ TRA CỨU: **Bác sĩ ${doctorInfo.fullName}** HIỆN ĐANG công tác tại **Bệnh viện/Phòng khám ${clinicInfo.clinicName}**.`;
        taskContext = `NHIỆM VỤ: Xác nhận thông tin chính xác, khẳng định chất lượng cơ sở y tế và bác sĩ. Chốt lịch ngay bằng cách hỏi: "Anh/chị dự định qua viện ngày nào để em đăng ký khung giờ vắng, không phải chờ đợi lâu ạ?".`;
        stateSummary = `check_doc_clinic|yes|doc=${doctorInfo.fullName}|clinic=${clinicInfo.clinicName}`;
      } else {
        const suggestionText = doctorsInClinic?.length
          ? `\nTuy nhiên, cơ sở này đang có các bác sĩ giỏi khác: ${doctorsInClinic
              .slice(0, 3)
              .map((d) => d.fullName)
              .join(", ")}`
          : "";
        dataContext = `❌ KẾT QUẢ TRA CỨU: **Bác sĩ ${doctorInfo.fullName}** hiện KHÔNG công tác tại **Bệnh viện ${clinicInfo.clinicName}**.${suggestionText}`;
        taskContext = `NHIỆM VỤ: Thông báo rõ ràng việc không trùng khớp. Thực hiện điều hướng thông minh: Hỏi khách đang muốn ưu tiên khám tại Bệnh viện này (chọn bác sĩ khác) hay quyết tâm khám Bác sĩ này (chuyển viện).`;
        stateSummary = `check_doc_clinic|no|doc=${doctorInfo.fullName}|clinic=${clinicInfo.clinicName}`;
      }
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Không tìm thấy đầy đủ dữ liệu bác sĩ hoặc bệnh viện để đối chiếu.`;
      taskContext = `NHIỆM VỤ: Xin lỗi vì tên nhập vào còn mơ hồ. Đề nghị viết rõ đầy đủ tên bác sĩ và cơ sở y tế để em đối chiếu lịch làm việc.`;
      stateSummary = "check_doc_clinic_missing_info";
    }
  } else if (intent === "doctor_fee") {
    if (doctorInfo) {
      const feeText =
        doctorInfo.consultationFee && doctorInfo.consultationFee > 0
          ? `${doctorInfo.consultationFee.toLocaleString("vi-VN")} VNĐ`
          : "Chưa cập nhật bảng giá công khai";
      dataContext = `✅ KẾT QUẢ TRA CỨU GIÁ KHÁM: **Bác sĩ ${doctorInfo.fullName}** | Phí khám gốc niêm yết: **${feeText}**.`;
      taskContext = `NHIỆM VỤ: Thông báo chi phí minh bạch. Khẳng định đây là mức phí xứng đáng với năng lực bác sĩ. Hỏi xem anh/chị có muốn đặt lịch hẹn luôn không để giữ suất khám giá gốc.`;
      stateSummary = `doctor_fee|doctor=${doctorInfo.fullName}`;
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Không tìm thấy bác sĩ này để tra cứu giá.`;
      taskContext = `NHIỆM VỤ: Báo cáo không tìm thấy hồ sơ bác sĩ. Đề xuất tìm kiếm giá khám chung theo chuyên khoa để tham khảo trước.`;
      stateSummary = "doctor_fee_not_found";
    }
  } else if (intent === "doctor_info") {
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
        : "Đang cập nhật";
      const workplaceText = doctorInfo.clinicName
        ? doctorInfo.clinicAddress
          ? `${doctorInfo.clinicName} - ${doctorInfo.clinicAddress}`
          : doctorInfo.clinicName
        : "Đang cập nhật";

      dataContext = `✅ KẾT QUẢ HỒ SƠ BÁC SĨ:
- 👨‍⚕️ **Họ và tên**: Bác sĩ ${doctorInfo.fullName}
- 🩺 **Chuyên khoa**: ${doctorInfo.specialty?.name || "Đang cập nhật"}
- 🎓 **Kinh nghiệm**: ${expText}
- 💰 **Chi phí khám**: ${feeFormatted}
- ⭐ **Điểm uy tín**: ${avgRating}/5 (${doctorInfo.totalReviews} lượt đánh giá)
- 🏥 **Nơi công tác**: ${workplaceText}
- 📝 **Giới thiệu**: ${doctorInfo.bio || "Bác sĩ có chuyên môn sâu, y đức tận tâm."}`;

      taskContext = `NHIỆM VỤ: Thiết kế lời giới thiệu bác sĩ như một danh thiếp chuyên nghiệp. Sử dụng ngôn từ tôn vinh tay nghề để xây dựng niềm tin tuyệt đối cho bệnh nhân. Chốt sale bằng câu hỏi điều hướng đặt lịch ưu tiên.`;
      stateSummary = `doctor_info|doctor=${doctorInfo.fullName}`;
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Không tìm thấy bác sĩ theo từ khóa này.`;
      taskContext = `NHIỆM VỤ: Báo hệ thống chưa liên kết dữ liệu với bác sĩ này. Đề nghị cung cấp triệu chứng hoặc khu vực để em thay thế bằng một vị bác sĩ giỏi khác có profile tương đương.`;
      stateSummary = "doctor_info_not_found";
    }
  } else if (intent === "check_specialty_in_clinic") {
    if (specialtyCheckResult?.found && specialtyCheckResult.hasSpecialty) {
      dataContext = `✅ KẾT QUẢ TRA CỨU: **Bệnh viện ${specialtyCheckResult.clinic.clinicName}** HIỆN CÓ tiếp nhận tại **Khoa ${specialtyCheckResult.specialty.name}**.\n- 📍 Địa chỉ: ${specialtyCheckResult.clinic.address}`;
      taskContext = `NHIỆM VỤ: Xác nhận thông tin có khoa này. Khẳng định thế mạnh thăm khám của cơ sở. Ân cần hỏi xem đang có biểu hiện gì bất thường cần gặp bác sĩ khoa này để đăng ký lịch hẹn trước.`;
      stateSummary = `specialty_check|has|clinic=${specialtyCheckResult.clinic.clinicName}`;
    } else if (
      specialtyCheckResult?.found &&
      !specialtyCheckResult.hasSpecialty
    ) {
      const specList = specialtyCheckResult.availableSpecialtiesNames?.length
        ? specialtyCheckResult.availableSpecialtiesNames.slice(0, 5).join(", ")
        : "chưa có dữ liệu";
      dataContext = `❌ KẾT QUẢ TRA CỨU: **Bệnh viện ${specialtyCheckResult.clinic.clinicName}** KHÔNG CÓ **Khoa ${specialtyCheckResult.specialty.name}**.\n- Các khoa hoạt động: ${specList}.`;
      taskContext = `NHIỆM VỤ: Thông báo rõ không có khoa này. Hỏi xem khách muốn chuyển sang khám khoa sẵn có, hay để em tìm bệnh viện uy tín khác có chuyên khoa ${specialtyCheckResult.specialty.name} ngay gần đó.`;
      stateSummary = `specialty_check|not_has|clinic=${specialtyCheckResult.clinic.clinicName}`;
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Không tìm thấy thực thể bệnh viện hoặc chuyên khoa để đối sánh.`;
      taskContext = `NHIỆM VỤ: Báo lỗi dữ liệu khéo léo. Hướng dẫn khách hàng cung cấp chính xác lại tên phòng khám và khoa.`;
      stateSummary = "specialty_check|error";
    }
  } else if (intent === "check_hospital_existence") {
    if (existenceResult?.found && existenceResult?.clinic) {
      dataContext = `✅ KẾT QUẢ TRA CỨU: **Cơ sở ${existenceResult.clinic.clinicName}** ĐÃ ĐƯỢC XÁC THỰC trên hệ thống DOCGO.\n- 📍 Địa chỉ: ${existenceResult.clinic.address}`;
      taskContext = `NHIỆM VỤ: Xác nhận cơ sở tồn tại. Đưa ra câu hỏi CTA: "Anh/chị đang cần tìm bác sĩ giỏi hoặc đặt lịch khám tại cơ sở này đúng không ạ?".`;
      stateSummary = `check_existence|found|clinic=${existenceResult.clinic.clinicName}`;
    } else {
      dataContext = `❌ KẾT QUẢ TRA CỨU: Hệ thống DOCGO chưa ghi nhận cơ sở y tế mang tên "${existenceResult?.queryName || "đã nhập"}".`;
      taskContext = `NHIỆM VỤ: Thông báo chưa có dữ liệu. Kéo khách vào luồng chốt sale mở: "Dạ, anh/chị cho em xin Quận/Huyện đang ở để em tìm phòng khám đối tác tương đương và uy tín nhất gần mình thay thế nhé?".`;
      stateSummary = "check_existence|not_found";
    }
  } else {
    // ========== 5. MẶC ĐỊNH (TƯ VẤN TRIỆU CHỨNG, BỆNH LÝ, TÌM KIẾM CHUNG) ==========
    const specialtyList = specialties.map((s) => `- ${s.name}`).join("\n");
    const displaySpec =
      currentSpec === "Nội tổng quát"
        ? "Đa khoa (Khám tổng quát)"
        : currentSpec;

    if (hospitals.length > 0) {
      const hospitalData = hospitals
        .map(
          (h) =>
            `🏥 **${h.clinicName}**\n📍 Địa chỉ: ${h.address}\n🩺 Khoa tiếp nhận: **${displaySpec}**`,
        )
        .join("\n\n");

      dataContext = `✅ DỮ LIỆU HỆ THỐNG:\n- Khu vực: ${userLoc || "Gần bạn"}\n- Gợi ý chuyên khoa: **${displaySpec}**\n\nCơ sở y tế khả dụng gần nhất:\n${hospitalData}`;
      taskContext = `NHIỆM VỤ:
1. Nếu khách kể triệu chứng: Lắng nghe, thấu cảm sâu sắc, khuyên đi khám sớm là giải pháp an tâm nhất.
2. Giới thiệu trang trọng danh sách bệnh viện khả dụng ở trên.
3. CHỐT SALE (CTA): Hỏi khách muốn lựa chọn cơ sở nào trong danh sách để em làm thủ tục lấy số thứ tự ưu tiên gặp bác sĩ trước.`;
      stateSummary = `general_consultation|loc=${userLoc || "none"}|found=yes`;
    } else {
      dataContext = `❌ DỮ LIỆU HỆ THỐNG:\n- Khu vực: ${userLoc || "Chưa xác định"}\n- Gợi ý chuyên khoa: **${displaySpec}**\n- Cơ sở gần nhất: Trống dữ liệu.`;
      taskContext = `NHIỆM VỤ ĐẶC BIỆT (THIẾU DATA CƠ SỞ - INFORMATION GATHERING):
1. Thể hiện sự ân cần thấu hiểu, hỏi han sức khỏe người bệnh trước. Khuyên nên đi khám sớm.
2. ĐIỀU HƯỚNG: TUYỆT ĐỐI không nói "hệ thống đang mở rộng". Khéo léo hỏi một trong các câu gợi mở sau để kéo khách cung cấp dữ liệu:
   - "Dạ, để kết nối với cơ sở y tế uy tín gần nhất, anh/chị hiện đang ở Quận/Huyện, Tỉnh thành nào ạ?"
   - HOẶC: "Dạ, anh/chị ưu tiên khám tại một bệnh viện lớn hay phòng khám cụ thể nào quen thuộc không ạ, để em kiểm tra lịch trống cho mình?"
3. Luôn giữ thái độ đồng hành nhiệt huyết.`;
      stateSummary = `general_consultation|loc=${userLoc || "none"}|found=no`;
    }
  }

  // ==========================================================================
  // 6. RÁP TOÀN BỘ THÀNH CHUỖI SYSTEM INSTRUCTION & ÉP CHUẨN ĐẦU RA JSON
  // ==========================================================================
  return `${BASE_PERSONA}

==============================================================================
DANH SÁCH TOÀN BỘ CHUYÊN KHOA HỆ THỐNG HỖ TRỢ (THAM KHẢO PHÂN LOẠI BỆNH):
${specialties.map((s) => `- ${s.name}`).join("\n")}
==============================================================================
${memoryInstruction}
==============================================================================
NGỮ CẢNH DỮ LIỆU THỰC TẾ (CHỈ ĐƯỢC DÙNG DATA NÀY):
${dataContext}
==============================================================================
CHỈ THỊ NHIỆM VỤ CỤ THỂ:
${taskContext}
==============================================================================

RÀNG BUỘC KỸ THUẬT TUYỆT ĐỐI (STRICT COMPLIANCE):
1. KHÔNG ĐƯỢC ẢO GIÁC: Cấm bịa đặt tên Bác sĩ, địa chỉ, số điện thoại hay mức phí không có trong "NGỮ CẢNH DỮ LIỆU THỰC TẾ". Nếu thiếu dữ liệu, thực hiện trung thực theo đúng CHỈ THỊ NHIỆM VỤ.
2. LUÔN TRẢ VỀ JSON CHUẨN: Toàn bộ nội dung trả lời cho khách phải nằm trong key "reply". Trả về chuỗi String JSON nguyên bản, KHÔNG bọc bằng thẻ markdown \`\`\`json.

ĐỊNH DẠNG JSON ĐẦU RA BẮT BUỘC:
{
  "reply": "Nội dung câu trả lời hoàn chỉnh, trình bày Markdown đẹp và kết bằng câu hỏi CTA (trừ trường hợp từ chối tư vấn ngoại lệ).",
  "state_summary": "${stateSummary}"
}
`;
};
