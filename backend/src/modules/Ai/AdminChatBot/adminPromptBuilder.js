// backend/src/modules/Ai/AdminChat/adminPromptBuilder.js

const BASE_PERSONA = `
Bạn là Trợ lý AI dành cho Quản trị viên (Admin) của nền tảng DocGo.
VAI TRÒ: Hỗ trợ admin thống kê, kiểm tra trạng thái hệ thống, quản lý bác sĩ, phòng khám, doanh thu.
THÁI ĐỘ & GIỌNG VĂN: Chuyên nghiệp, chính xác, nhanh nhạy với số liệu. Xưng hô: "em" – gọi admin là "anh/chị".
QUY TẮC TRÌNH BÀY UI/UX (BẮT BUỘC):
1. Sử dụng **in đậm** cho số liệu, tên cột, từ khóa.
2. Dùng danh sách (bullet points).
3. Dùng emoji: 📊, ✅, ⚠️, ❌, 👨‍⚕️, 🏥, 💡, 📋.
4. KHÔNG hiển thị code/JSON thô.
5. Danh sách bác sĩ: bullet cấp 2 (tên, kinh nghiệm, phí khám, nơi công tác, đánh giá).
TUYỆT ĐỐI không bịa đặt dữ liệu.
`;

const JSON_INSTRUCTION = `
RÀNG BUỘC KỸ THUẬT:
1. KHÔNG ẢO GIÁC: Chỉ sử dụng dữ liệu trong "DỮ LIỆU THỰC TẾ".
2. LUÔN TRẢ VỀ JSON: { "reply": "nội dung câu trả lời", "state_summary": "tóm tắt ngắn gọn" }
3. KHÔNG có text thừa ngoài JSON.
`;

const formatDoctor = (doc, idx) => {
  const fee = doc.consultationFee
    ? `${doc.consultationFee.toLocaleString("vi-VN")} VNĐ`
    : "Chưa cập nhật";
  const exp = doc.experience ? `${doc.experience} năm` : "Chưa rõ";
  const clinic = doc.clinicName
    ? `🏥 **${doc.clinicName}**`
    : "🏥 Chưa có thông tin";
  const address = doc.clinicAddress ? ` – ${doc.clinicAddress}` : "";
  const rating = doc.totalReviews ? `⭐ ${doc.totalReviews} đánh giá` : "";
  return `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🩺 Kinh nghiệm: ${exp}\n   - 💰 Phí khám: ${fee}\n   - ${clinic}${address}\n   - ${rating}`;
};

// ---------- CÁC BUILDER CHO TỪNG INTENT (giữ nguyên cũ) ----------
const intentBuilders = {
  list_doctors_by_specialty: (ctx) => {
    if (ctx.error === "SPECIALTY_NOT_FOUND") {
      const suggestions =
        ctx.suggestions?.map((s) => `- ${s}`).join("\n") || "- Không có gợi ý";
      return {
        data: `⚠️ KHÔNG TÌM THẤY CHUYÊN KHOA: "${ctx.querySpecialty}"\nGỢI Ý KHÁC:\n${suggestions}`,
        task: `Thông báo không tìm thấy chuyên khoa, liệt kê gợi ý. KHÔNG hỏi mở rộng về bệnh viện.`,
        state: `admin_specialty_not_found_${ctx.querySpecialty}`,
      };
    }
    if (!ctx.doctors?.length) {
      return {
        data: `📋 CHUYÊN KHOA: ${ctx.specialty?.name || "unknown"}\n- Bác sĩ đã duyệt: **0**`,
        task: `Thông báo chưa có bác sĩ hoạt động. Gợi ý xem bác sĩ chưa duyệt.`,
        state: `admin_no_doctors_for_${ctx.specialty?.name || "unknown"}`,
      };
    }
    return {
      data: `📋 DANH SÁCH BÁC SĨ CHUYÊN KHOA: **${ctx.specialty.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      task: `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào không ạ?"
      \nYÊU CẦU JSON: "state_summary" phải có dạng "approved_specialty_${ctx.specialty.name}_${ctx.doctors.length}".`,
      state: `admin_list_doctors_${ctx.specialty.name}_${ctx.doctors.length}`,
    };
  },

  count_doctors_by_approval_status: (ctx) => {
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
      };
    }
    if (typeof ctx.count === "number") {
      const type = ctx.statusLabel === "đã duyệt" ? "Đã duyệt" : "Chưa duyệt";
      const statusKey = ctx.statusLabel === "đã duyệt" ? "approved" : "pending";
      return {
        data: `📊 THỐNG KÊ:\n- Trạng thái: ${type.toUpperCase()}\n- Số lượng: **${ctx.count}**`,
        task: `Trình bày kết quả rõ ràng.\n• Trạng thái: **${type}**\n• Số lượng: **${ctx.count}**\nBắt buộc thêm: "💡 Anh/chị có muốn tìm bác sĩ theo chuyên khoa/bệnh viện không ạ?"
        \nYÊU CẦU JSON: "state_summary" phải có dạng "${statusKey}_count_${ctx.count}".`,
        state: `admin_count_${statusKey}_${ctx.count}`,
      };
    }
    return {
      data: `⚠️ TRẠNG THÁI KHÔNG XÁC ĐỊNH.`,
      task: `Hướng dẫn lại cú pháp.`,
      state: "admin_invalid_status",
    };
  },

  list_doctors_by_clinic: (ctx) => {
    if (ctx.error === "CLINIC_NOT_FOUND") {
      const suggestions =
        ctx.suggestions?.map((s) => `- ${s}`).join("\n") || "- Không có gợi ý";
      return {
        data: `⚠️ KHÔNG TÌM THẤY BỆNH VIỆN/PHÒNG KHÁM: "${ctx.queryClinic}"\nGỢI Ý KHÁC:\n${suggestions}`,
        task: `Thông báo không tìm thấy cơ sở, liệt kê gợi ý. KHÔNG tự ý thay thế.`,
        state: `admin_clinic_not_found_${ctx.queryClinic}`,
      };
    }
    if (!ctx.doctors?.length) {
      const statusText =
        ctx.statusFilter === "pending" ? "chưa duyệt" : "đã duyệt";
      const statusKey = ctx.statusFilter === "pending" ? "pending" : "approved";
      return {
        data: `🏥 CƠ SỞ: **${ctx.clinic.name}**\n- Bác sĩ ${statusText}: **0**`,
        task: `Thông báo chưa có bác sĩ ${statusText}. Gợi ý: "Anh/chị có muốn xem danh sách bác sĩ ${ctx.statusFilter === "pending" ? "đã duyệt" : "chưa duyệt"} của bệnh viện này không?"`,
        state: `admin_no_doctors_${statusKey}_for_${ctx.clinic.name}`,
      };
    }
    const statusText =
      ctx.statusFilter === "pending" ? "CHƯA DUYỆT" : "ĐÃ DUYỆT";
    const statusKey = ctx.statusFilter === "pending" ? "pending" : "approved";
    return {
      data: `📋 DANH SÁCH BÁC SĨ **${statusText}** – BỆNH VIỆN: **${ctx.clinic.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      task: `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào hoặc lọc theo chuyên khoa không ạ?"
      \nYÊU CẦU JSON: "state_summary" phải có dạng "${statusKey}_clinic_${ctx.clinic.name}_${ctx.doctors.length}".`,
      state: `admin_list_doctors_${statusKey}_${ctx.clinic.name}_${ctx.doctors.length}`,
    };
  },

  // ==================== [NEW] BUILDER CHO DANH SÁCH BỆNH VIỆN THEO TRẠNG THÁI ====================
  list_clinics_by_approval_status: (ctx) => {
    if (ctx.error === "MISSING_STATUS") {
      return {
        data: `⚠️ THIẾU THÔNG TIN TRẠNG THÁI.`,
        task: `Thông báo lỗi, yêu cầu admin nói rõ "chưa duyệt", "đã duyệt" hoặc "bị từ chối".`,
        state: `admin_missing_status`,
      };
    }
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: `admin_db_error`,
      };
    }
    const count = ctx.count || 0;
    const label =
      ctx.statusLabel === "chưa duyệt"
        ? "CHƯA DUYỆT"
        : ctx.statusLabel === "đã duyệt"
          ? "ĐÃ DUYỆT"
          : ctx.statusLabel === "bị từ chối"
            ? "BỊ TỪ CHỐI"
            : (ctx.statusLabel || "KHÔNG XÁC ĐỊNH").toUpperCase();

    if (count === 0) {
      return {
        data: `🏥 DANH SÁCH BỆNH VIỆN ${label}: **0**`,
        task: `Thông báo chưa có cơ sở nào. Gợi ý: "Anh/chị có muốn xem danh sách ${ctx.statusLabel === "chưa duyệt" ? "đã duyệt" : "chưa duyệt"} không?"`,
        state: `no_clinics_${ctx.statusLabel}_0`,
      };
    }

    const clinicList = ctx.clinics.map((c) => `- ${c.name}`).join("\n");
    const statusKey =
      ctx.statusLabel === "chưa duyệt"
        ? "pending"
        : ctx.statusLabel === "đã duyệt"
          ? "approved"
          : ctx.statusLabel;
    return {
      data: `📋 DANH SÁCH BỆNH VIỆN ${label} (Tổng: **${count}**)\n\n${clinicList}`,
      task: `Trình bày danh sách markdown với bullet points, CHỈ HIỂN THỊ TÊN, không thêm địa chỉ hay thông tin khác. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bệnh viện nào không ạ?"
      \nYÊU CẦU JSON: "state_summary" phải có dạng "${statusKey}_clinics_${count}".`,
      state: `list_clinics_${ctx.statusLabel}_${count}`,
    };
  },

  // ==================== [NEW] BUILDER CHO CHI TIẾT MỘT BỆNH VIỆN ====================
  get_clinic_details: (ctx) => {
    if (ctx.error === "MISSING_CLINIC_NAME") {
      return {
        data: `⚠️ THIẾU TÊN BỆNH VIỆN.`,
        task: `Thông báo lỗi, yêu cầu admin cung cấp tên bệnh viện cụ thể.`,
        state: `admin_missing_clinic_name`,
      };
    }
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: `admin_db_error`,
      };
    }
    if (ctx.error === "CLINIC_NOT_FOUND") {
      const suggestions =
        ctx.suggestions?.map((s) => `- ${s}`).join("\n") || "- Không có gợi ý";
      return {
        data: `⚠️ KHÔNG TÌM THẤY BỆNH VIỆN/PHÒNG KHÁM: "${ctx.queryClinic}"\nGỢI Ý KHÁC:\n${suggestions}`,
        task: `Thông báo không tìm thấy, liệt kê gợi ý. Hỏi: "Anh/chị có muốn xem danh sách bệnh viện đã duyệt hoặc chưa duyệt không ạ?"`,
        state: `admin_clinic_not_found_${ctx.queryClinic}`,
      };
    }

    const clinic = ctx.clinic;
    if (!clinic) {
      return {
        data: `⚠️ KHÔNG CÓ DỮ LIỆU.`,
        task: `Thông báo lỗi không xác định.`,
        state: `admin_no_clinic_data`,
      };
    }

    // Format chi tiết clinic
    const specialties =
      clinic.specialties?.map((s) => s.name).join(", ") || "Chưa cập nhật";
    const fee = clinic.consultationFee
      ? `${clinic.consultationFee.toLocaleString("vi-VN")} VNĐ`
      : "Chưa cập nhật";
    const statusText =
      {
        pending: "Chờ duyệt",
        contacted: "Đã liên hệ",
        resolved: "Đã duyệt",
        rejected: "Từ chối",
        locked: "Đã khóa",
        deleted: "Đã xóa",
      }[clinic.status] || clinic.status;

    return {
      data:
        `🏥 **THÔNG TIN CHI TIẾT BỆNH VIỆN**\n\n` +
        `📛 **Tên:** ${clinic.clinicName}\n` +
        `📍 **Địa chỉ:** ${clinic.address || "Chưa cập nhật"}\n` +
        `📞 **Điện thoại:** ${clinic.phone || "Chưa cập nhật"}\n` +
        `📧 **Email:** ${clinic.email || "Chưa cập nhật"}\n` +
        `👤 **Người đại diện:** ${clinic.representativeName || "Chưa cập nhật"}\n` +
        `🏢 **Loại hình:** ${clinic.clinicType || "Chưa cập nhật"}\n` +
        `💰 **Phí khám:** ${fee}\n` +
        `✅ **Trạng thái:** ${statusText}\n` +
        `🩺 **Chuyên khoa:** ${specialties}\n` +
        (clinic.notes ? `📝 **Ghi chú:** ${clinic.notes}\n` : "") +
        (clinic.image ? `🖼️ **Hình ảnh:** ${clinic.image}\n` : ""),
      task:
        `Trình bày chi tiết rõ ràng, dễ đọc. Sau đó hỏi: "Anh/chị có muốn xem danh sách bác sĩ của bệnh viện này không ạ?"\n` +
        `YÊU CẦU JSON: "state_summary" có dạng "clinic_details_${clinic.clinicName.replace(/\s/g, "_")}"`,
      state: `clinic_details_${clinic.clinicName.replace(/\s/g, "_")}`,
    };
  },
};

// Hàm buildAdminPrompt giữ nguyên (không thay đổi)
export const buildAdminPrompt = (context) => {
  let { data = "", task = "", state = "admin_general" } = {};

  if (context.requiresClarification && context.clarificationMessage) {
    data = `⚠️ YÊU CẦU LÀM RÕ: ${context.clarificationMessage}`;
    task = `Lặp lại thông báo làm rõ lịch sử. Không trả lời ngoài phạm vi.`;
    state = "admin_clarification_required";
  } else if (intentBuilders[context.intent]) {
    ({ data, task, state } = intentBuilders[context.intent](context));
  } else {
    data = `❓ CHƯA HỖ TRỢ.`;
    task = `Thông báo tính năng đang phát triển. Gợi ý tính năng đếm bác sĩ/liệt kê theo chuyên khoa hoặc bệnh viện.`;
    state = "admin_unsupported_intent";
  }

  return `${BASE_PERSONA}\n\n=== DỮ LIỆU THỰC TẾ ===\n${data}\n\n=== CHỈ THỊ ===\n${task}\n\n${JSON_INSTRUCTION}`;
};
