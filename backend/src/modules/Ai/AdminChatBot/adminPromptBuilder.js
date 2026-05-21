// backend/src/modules/Ai/AdminChat/adminPromptBuilder.js

// ===============================
// 1. CONSTANTS & CONFIGURATION
// ===============================

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

// Helper: format số lẻ với locale vi-VN
const formatNumber = (num) => num?.toLocaleString("vi-VN") ?? "0";
const formatCurrency = (num) => `${formatNumber(num)} VNĐ`;

// Helper: format một doctor object (giữ nguyên output cũ)
const formatDoctor = (doc, idx) => {
  const fee = doc.consultationFee
    ? formatCurrency(doc.consultationFee)
    : "Chưa cập nhật";
  const exp = doc.experience ? `${doc.experience} năm` : "Chưa rõ";
  const clinic = doc.clinicName
    ? `🏥 **${doc.clinicName}**`
    : "🏥 Chưa có thông tin";
  const address = doc.clinicAddress ? ` – ${doc.clinicAddress}` : "";
  const rating = doc.totalReviews ? `⭐ ${doc.totalReviews} đánh giá` : "";
  return `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🩺 Kinh nghiệm: ${exp}\n   - 💰 Phí khám: ${fee}\n   - ${clinic}${address}\n   - ${rating}`;
};

// Map cho nhãn thời gian (dùng trong các builder thống kê)
const TIME_LABEL_MAP = {
  today: "HÔM NAY",
  yesterday: "HÔM QUA",
  this_week: "TUẦN NÀY",
  last_week: "TUẦN TRƯỚC",
  next_week: "TUẦN SAU",
  this_month: "THÁNG NÀY",
  last_month: "THÁNG TRƯỚC",
  next_month: "THÁNG SAU",
};

// ===============================
// 2. INTENT BUILDERS (giữ nguyên output text)
// ===============================

const intentBuilders = {
  // ----- Bác sĩ theo chuyên khoa -----
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
      const statusText =
        ctx.statusFilter === "pending" ? "chưa duyệt" : "đã duyệt";
      const stateSummary = JSON.stringify({
        statusFilter: ctx.statusFilter,
        count: 0,
      });
      return {
        data: `📋 CHUYÊN KHOA: ${ctx.specialty?.name || "unknown"}\n- Bác sĩ ${statusText}: **0**`,
        task: `Thông báo chưa có bác sĩ hoạt động. Gợi ý xem bác sĩ ${ctx.statusFilter === "pending" ? "đã duyệt" : "chưa duyệt"}.`,
        state: stateSummary,
      };
    }
    const statusText =
      ctx.statusFilter === "pending" ? "CHƯA DUYỆT" : "ĐÃ DUYỆT";
    const stateSummary = JSON.stringify({
      statusFilter: ctx.statusFilter,
      count: ctx.doctors.length,
    });
    return {
      data: `📋 DANH SÁCH BÁC SĨ ${statusText} CHUYÊN KHOA: **${ctx.specialty.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      task: `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào không ạ?"`,
      state: stateSummary,
    };
  },

  // ----- Đếm bác sĩ theo trạng thái -----
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
      const stateSummary = JSON.stringify({
        statusFilter: statusKey,
        count: ctx.count,
      });
      return {
        data: `📊 THỐNG KÊ:\n- Trạng thái: ${type.toUpperCase()}\n- Số lượng: **${ctx.count}**`,
        task: `Trình bày kết quả rõ ràng. Bắt buộc thêm: "💡 Anh/chị có muốn tìm bác sĩ theo chuyên khoa/bệnh viện không ạ?"`,
        state: stateSummary,
      };
    }
    return {
      data: `⚠️ TRẠNG THÁI KHÔNG XÁC ĐỊNH.`,
      task: `Hướng dẫn lại cú pháp.`,
      state: "admin_invalid_status",
    };
  },

  // ----- Bác sĩ theo phòng khám -----
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
      const stateSummary = JSON.stringify({
        statusFilter: ctx.statusFilter,
        count: 0,
      });
      return {
        data: `🏥 CƠ SỞ: **${ctx.clinic.name}**\n- Bác sĩ ${statusText}: **0**`,
        task: `Thông báo chưa có bác sĩ ${statusText}. Gợi ý: "Anh/chị có muốn xem danh sách bác sĩ ${ctx.statusFilter === "pending" ? "đã duyệt" : "chưa duyệt"} của bệnh viện này không?"`,
        state: stateSummary,
      };
    }
    const statusText =
      ctx.statusFilter === "pending" ? "CHƯA DUYỆT" : "ĐÃ DUYỆT";
    const stateSummary = JSON.stringify({
      statusFilter: ctx.statusFilter,
      count: ctx.doctors.length,
    });
    return {
      data: `📋 DANH SÁCH BÁC SĨ **${statusText}** – BỆNH VIỆN: **${ctx.clinic.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      task: `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào hoặc lọc theo chuyên khoa không ạ?"`,
      state: stateSummary,
    };
  },

  // ----- Danh sách phòng khám theo trạng thái -----
  list_clinics_by_approval_status: (ctx) => {
    if (ctx.error === "MISSING_STATUS") {
      return {
        data: `⚠️ THIẾU THÔNG TIN TRẠNG THÁI.`,
        task: `Yêu cầu admin nói rõ "chưa duyệt", "đã duyệt" hoặc "bị từ chối".`,
        state: "admin_missing_status",
      };
    }
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
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
    return {
      data: `📋 DANH SÁCH BỆNH VIỆN ${label} (Tổng: **${count}**)\n\n${clinicList}`,
      task: `Trình bày danh sách markdown với bullet points, CHỈ HIỂN THỊ TÊN. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bệnh viện nào không ạ?"`,
      state: `list_clinics_${ctx.statusLabel}_${count}`,
    };
  },

  // ----- Chi tiết phòng khám -----
  get_clinic_details: (ctx) => {
    if (ctx.error === "MISSING_CLINIC_NAME") {
      return {
        data: `⚠️ THIẾU TÊN BỆNH VIỆN.`,
        task: `Yêu cầu admin cung cấp tên bệnh viện cụ thể.`,
        state: "admin_missing_clinic_name",
      };
    }
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
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
        state: "admin_no_clinic_data",
      };
    }
    const specialties =
      clinic.specialties?.map((s) => s.name).join(", ") || "Chưa cập nhật";
    const fee = clinic.consultationFee
      ? formatCurrency(clinic.consultationFee)
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
      data: `🏥 **THÔNG TIN CHI TIẾT BỆNH VIỆN**\n\n📛 **Tên:** ${clinic.clinicName}\n📍 **Địa chỉ:** ${clinic.address || "Chưa cập nhật"}\n📞 **Điện thoại:** ${clinic.phone || "Chưa cập nhật"}\n📧 **Email:** ${clinic.email || "Chưa cập nhật"}\n👤 **Người đại diện:** ${clinic.representativeName || "Chưa cập nhật"}\n🏢 **Loại hình:** ${clinic.clinicType || "Chưa cập nhật"}\n💰 **Phí khám:** ${fee}\n✅ **Trạng thái:** ${statusText}\n🩺 **Chuyên khoa:** ${specialties}`,
      task: `Trình bày chi tiết rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem danh sách bác sĩ của bệnh viện này không ạ?"`,
      state: `clinic_details_${clinic.clinicName.replace(/\s/g, "_")}`,
    };
  },

  // ----- Thống kê tổng lịch hẹn -----
  total_appointment_stats: (ctx) => {
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
      };
    }
    const stats = ctx.stats;
    if (!stats || stats.total === undefined) {
      return {
        data: `⚠️ KHÔNG CÓ DỮ LIỆU LỊCH HẸN.`,
        task: `Thông báo chưa có lịch hẹn nào trên hệ thống.`,
        state: "admin_no_appointments",
      };
    }
    return {
      data: `📊 **THỐNG KÊ LỊCH HẸN TOÀN HỆ THỐNG**\n\n- Tổng số lịch hẹn: **${formatNumber(stats.total)}**\n- ✅ Đã thanh toán: **${formatNumber(stats.paid)}**\n- ⏳ Chưa thanh toán/thất bại: **${formatNumber(stats.unpaidFailed)}**\n- 🏥 Đã hoàn thành khám: **${formatNumber(stats.completed)}**\n- 📅 Đã xác nhận: **${formatNumber(stats.confirmed)}**\n- 🔄 Đã check-in: **${formatNumber(stats.checkedIn)}**\n- 💳 Chờ thanh toán: **${formatNumber(stats.pendingPayment)}**\n- ❌ Đã hủy: **${formatNumber(stats.cancelled)}**`,
      task: `Trình bày thống kê rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem chi tiết theo từng trạng thái hoặc lọc theo bác sĩ/phòng khám không ạ?"`,
      state: `total_appointments_${stats.total}`,
    };
  },

  // ----- Thống kê lịch hẹn theo thời gian -----
  appointment_stats_by_time: (ctx) => {
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
      };
    }
    if (ctx.error === "INVALID_TIME_RANGE") {
      return {
        data: `⚠️ KHOẢNG THỜI GIAN KHÔNG HỢP LỆ.`,
        task: `Thông báo và yêu cầu admin chọn lại (hôm nay, hôm qua, tuần này, ...).`,
        state: "admin_invalid_time_range",
      };
    }
    const stats = ctx.stats;
    if (!stats || stats.total === undefined) {
      return {
        data: `⚠️ KHÔNG CÓ LỊCH HẸN TRONG KHOẢNG THỜI GIAN NÀY.`,
        task: `Thông báo không có dữ liệu.`,
        state: "admin_no_appointments_in_range",
      };
    }
    const label = TIME_LABEL_MAP[ctx.timeRange] || ctx.timeRange;
    return {
      data: `📊 **THỐNG KÊ LỊCH HẸN – ${label}**\n\n- Tổng số lịch hẹn: **${formatNumber(stats.total)}**\n- ✅ Đã thanh toán: **${formatNumber(stats.paid)}**\n- ⏳ Chưa thanh toán/thất bại: **${formatNumber(stats.unpaidFailed)}**\n- 🏥 Đã hoàn thành khám: **${formatNumber(stats.completed)}**\n- 📅 Đã xác nhận: **${formatNumber(stats.confirmed)}**\n- 🔄 Đã check-in: **${formatNumber(stats.checkedIn)}**\n- 💳 Chờ thanh toán: **${formatNumber(stats.pendingPayment)}**\n- ❌ Đã hủy: **${formatNumber(stats.cancelled)}**`,
      task: `Trình bày thống kê rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem chi tiết hơn theo bác sĩ hoặc phòng khám không ạ?"`,
      state: `appointment_stats_${ctx.timeRange}_${stats.total}`,
    };
  },

  // ----- Thống kê tổng doanh thu (có phân chia lợi nhuận) -----
  total_revenue_stats: (ctx) => {
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
      };
    }
    const stats = ctx.stats;
    if (!stats || stats.totalRevenue === undefined) {
      return {
        data: `⚠️ KHÔNG CÓ DỮ LIỆU DOANH THU.`,
        task: `Thông báo chưa có giao dịch nào.`,
        state: "admin_no_revenue",
      };
    }
    const data = `
📊 **THỐNG KÊ DOANH THU & LỢI NHUẬN TOÀN HỆ THỐNG**

💰 Tổng doanh thu từ bệnh nhân: **${formatCurrency(stats.totalRevenue)}**
🧾 Tổng số giao dịch: **${formatNumber(stats.totalTransactions)}**
📊 Trung bình/giao dịch: **${formatCurrency(stats.averageRevenue)}**

📌 **Phân chia lợi nhuận (từ các ca hoàn thành):**
- 🏢 **Hệ thống nhận:** ${formatCurrency(stats.totalPlatformRevenue)}
- 🏥 **Bệnh viện/Phòng khám nhận:** ${formatCurrency(stats.totalClinicRevenue)}

💳 **Theo phương thức thanh toán:**
- Online: ${formatCurrency(stats.onlineRevenue)} (${stats.onlineCount} GD)
- Offline: ${formatCurrency(stats.offlineRevenue)} (${stats.offlineCount} GD)
    `.trim();
    return {
      data,
      task: `Trình bày số liệu rõ ràng. Hỏi thêm: "Anh/chị có muốn xem chi tiết theo từng phương thức thanh toán hoặc lọc theo thời gian không ạ?"`,
      state: `total_revenue_${stats.totalRevenue}`,
    };
  },

  // ----- Thống kê doanh thu theo thời gian (có breakdown) -----
  revenue_stats_by_time: (ctx) => {
    if (ctx.error === "DB_QUERY_FAILED") {
      return {
        data: `❌ LỖI HỆ THỐNG DB.`,
        task: `Thông báo lỗi tạm thời.`,
        state: "admin_db_error",
      };
    }
    if (ctx.error === "INVALID_TIME_RANGE") {
      return {
        data: `⚠️ KHOẢNG THỜI GIAN KHÔNG HỢP LỆ.`,
        task: `Thông báo và yêu cầu admin chọn lại (hôm nay, hôm qua, tuần này, ...).`,
        state: "admin_invalid_time_range",
      };
    }
    const stats = ctx.stats;
    if (!stats || stats.totalRevenue === undefined) {
      const timeLabel = ctx.timeRange ? ctx.timeRange.toUpperCase() : "NÀY";
      return {
        data: `⚠️ KHÔNG CÓ DỮ LIỆU DOANH THU TRONG KHOẢNG ${timeLabel}.`,
        task: `Thông báo chưa có giao dịch nào.`,
        state: `no_revenue_${ctx.timeRange || "unknown"}`,
      };
    }
    const label =
      TIME_LABEL_MAP[ctx.timeRange] ||
      ctx.timeRange?.toUpperCase() ||
      "KHOẢNG THỜI GIAN";
    const data = `
📊 **THỐNG KÊ DOANH THU - ${label}**

💰 Tổng doanh thu: **${formatCurrency(stats.totalRevenue)}**
🧾 Số giao dịch: **${formatNumber(stats.totalTransactions)}**
📊 Trung bình/giao dịch: **${formatCurrency(stats.averageRevenue)}**

💳 **Phân loại thanh toán:**
- Online: ${formatCurrency(stats.onlineRevenue)} (${stats.onlineCount} GD)
- Offline: ${formatCurrency(stats.offlineRevenue)} (${stats.offlineCount} GD)
    `.trim();
    return {
      data,
      task: `Trình bày số liệu rõ ràng. Hỏi thêm: "Anh/chị có muốn so sánh với kỳ trước hoặc xem biểu đồ không ạ?"`,
      state: `revenue_${ctx.timeRange}_${stats.totalRevenue}`,
    };
  },
};

// ===============================
// 3. MAIN EXPORT FUNCTION
// ===============================

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
