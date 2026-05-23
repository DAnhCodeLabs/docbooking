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
// 2. HELPERS (EXTREME DRY)
// ===============================

const formatNumber = (num) => num?.toLocaleString("vi-VN") ?? "0";
const formatCurrency = (num) => `${formatNumber(num)} VNĐ`;
const getSuggestions = (s) =>
  s?.length ? s.map((item) => `- ${item}`).join("\n") : "- Không có gợi ý";
const stateStr = (statusFilter, count) =>
  JSON.stringify({ statusFilter, count });
const result = (data, task, state) => ({ data, task, state });

const formatDoctor = (doc, idx) =>
  `${idx + 1}. **Bác sĩ ${doc.fullName}**\n   - 🩺 Kinh nghiệm: ${doc.experience ? `${doc.experience} năm` : "Chưa rõ"}\n   - 💰 Phí khám: ${doc.consultationFee ? formatCurrency(doc.consultationFee) : "Chưa cập nhật"}\n   - ${doc.clinicName ? `🏥 **${doc.clinicName}**` : "🏥 Chưa có thông tin"}${doc.clinicAddress ? ` – ${doc.clinicAddress}` : ""}\n   - ${doc.totalReviews ? `⭐ ${doc.totalReviews} đánh giá` : ""}`;

const formatApptStats = (s) =>
  `- Tổng số lịch hẹn: **${formatNumber(s.total)}**\n- ✅ Đã thanh toán: **${formatNumber(s.paid)}**\n- ⏳ Chưa thanh toán/thất bại: **${formatNumber(s.unpaidFailed)}**\n- 🏥 Đã hoàn thành khám: **${formatNumber(s.completed)}**\n- 📅 Đã xác nhận: **${formatNumber(s.confirmed)}**\n- 🔄 Đã check-in: **${formatNumber(s.checkedIn)}**\n- 💳 Chờ thanh toán: **${formatNumber(s.pendingPayment)}**\n- ❌ Đã hủy: **${formatNumber(s.cancelled)}**`;

// ===============================
// 3. INTENT BUILDERS
// ===============================

const intentBuilders = {
  list_doctors_by_specialty: (ctx) => {
    if (ctx.error === "SPECIALTY_NOT_FOUND")
      return result(
        `⚠️ KHÔNG TÌM THẤY CHUYÊN KHOA: "${ctx.querySpecialty}"\nGỢI Ý KHÁC:\n${getSuggestions(ctx.suggestions)}`,
        `Thông báo không tìm thấy chuyên khoa, liệt kê gợi ý. KHÔNG hỏi mở rộng về bệnh viện.`,
        `admin_specialty_not_found_${ctx.querySpecialty}`,
      );
    const lbl = ctx.statusFilter === "pending" ? "CHƯA DUYỆT" : "ĐÃ DUYỆT";
    const state = stateStr(ctx.statusFilter, ctx.doctors?.length || 0);
    if (!ctx.doctors?.length)
      return result(
        `📋 CHUYÊN KHOA: ${ctx.specialty?.name || "unknown"}\n- Bác sĩ ${lbl.toLowerCase()}: **0**`,
        `Thông báo chưa có bác sĩ hoạt động. Gợi ý xem bác sĩ ${ctx.statusFilter === "pending" ? "đã duyệt" : "chưa duyệt"}.`,
        state,
      );
    return result(
      `📋 DANH SÁCH BÁC SĨ ${lbl} CHUYÊN KHOA: **${ctx.specialty.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào không ạ?"`,
      state,
    );
  },

  count_doctors_by_approval_status: (ctx) => {
    if (typeof ctx.count !== "number")
      return result(
        `⚠️ TRẠNG THÁI KHÔNG XÁC ĐỊNH.`,
        `Hướng dẫn lại cú pháp.`,
        "admin_invalid_status",
      );
    return result(
      `📊 THỐNG KÊ:\n- Trạng thái: ${ctx.statusLabel === "đã duyệt" ? "ĐÃ DUYỆT" : "CHƯA DUYỆT"}\n- Số lượng: **${ctx.count}**`,
      `Trình bày kết quả rõ ràng. Bắt buộc thêm: "💡 Anh/chị có muốn tìm bác sĩ theo chuyên khoa/bệnh viện không ạ?"`,
      stateStr(ctx.statusFilter, ctx.count),
    );
  },

  list_doctors_by_clinic: (ctx) => {
    if (ctx.error === "CLINIC_NOT_FOUND")
      return result(
        `⚠️ KHÔNG TÌM THẤY BỆNH VIỆN/PHÒNG KHÁM: "${ctx.queryClinic}"\nGỢI Ý KHÁC:\n${getSuggestions(ctx.suggestions)}`,
        `Thông báo không tìm thấy cơ sở, liệt kê gợi ý. KHÔNG tự ý thay thế.`,
        `admin_clinic_not_found_${ctx.queryClinic}`,
      );
    const lbl = ctx.statusFilter === "pending" ? "CHƯA DUYỆT" : "ĐÃ DUYỆT";
    const state = stateStr(ctx.statusFilter, ctx.doctors?.length || 0);
    if (!ctx.doctors?.length)
      return result(
        `🏥 CƠ SỞ: **${ctx.clinic.name}**\n- Bác sĩ ${lbl.toLowerCase()}: **0**`,
        `Thông báo chưa có bác sĩ ${lbl.toLowerCase()}. Gợi ý: "Anh/chị có muốn xem danh sách bác sĩ ${ctx.statusFilter === "pending" ? "đã duyệt" : "chưa duyệt"} của bệnh viện này không?"`,
        state,
      );
    return result(
      `📋 DANH SÁCH BÁC SĨ **${lbl}** – BỆNH VIỆN: **${ctx.clinic.name}**\nTổng: **${ctx.doctors.length}**\n\n${ctx.doctors.map(formatDoctor).join("\n\n")}`,
      `Trình bày danh sách markdown. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bác sĩ nào hoặc lọc theo chuyên khoa không ạ?"`,
      state,
    );
  },

  list_clinics_by_approval_status: (ctx) => {
    if (ctx.error === "MISSING_STATUS")
      return result(
        `⚠️ THIẾU THÔNG TIN TRẠNG THÁI.`,
        `Yêu cầu admin nói rõ "chưa duyệt", "đã duyệt" hoặc "bị từ chối".`,
        "admin_missing_status",
      );
    const count = ctx.count || 0;
    const lbl =
      {
        "chưa duyệt": "CHƯA DUYỆT",
        "đã duyệt": "ĐÃ DUYỆT",
        "bị từ chối": "BỊ TỪ CHỐI",
      }[ctx.statusLabel] || "KHÔNG XÁC ĐỊNH";
    if (!count)
      return result(
        `🏥 DANH SÁCH BỆNH VIỆN ${lbl}: **0**`,
        `Thông báo chưa có cơ sở nào. Gợi ý: "Anh/chị có muốn xem danh sách ${ctx.statusLabel === "chưa duyệt" ? "đã duyệt" : "chưa duyệt"} không?"`,
        `no_clinics_${ctx.statusLabel}_0`,
      );
    return result(
      `📋 DANH SÁCH BỆNH VIỆN ${lbl} (Tổng: **${count}**)\n\n${ctx.clinics.map((c) => `- ${c.name}`).join("\n")}`,
      `Trình bày danh sách markdown với bullet points, CHỈ HIỂN THỊ TÊN. Sau đó hỏi: "Anh/chị có muốn xem chi tiết bệnh viện nào không ạ?"`,
      `list_clinics_${ctx.statusLabel}_${count}`,
    );
  },

  get_clinic_details: (ctx) => {
    if (ctx.error === "MISSING_CLINIC_NAME")
      return result(
        `⚠️ THIẾU TÊN BỆNH VIỆN.`,
        `Yêu cầu admin cung cấp tên bệnh viện cụ thể.`,
        "admin_missing_clinic_name",
      );
    if (ctx.error === "CLINIC_NOT_FOUND")
      return result(
        `⚠️ KHÔNG TÌM THẤY BỆNH VIỆN/PHÒNG KHÁM: "${ctx.queryClinic}"\nGỢI Ý KHÁC:\n${getSuggestions(ctx.suggestions)}`,
        `Thông báo không tìm thấy, liệt kê gợi ý. Hỏi: "Anh/chị có muốn xem danh sách bệnh viện đã duyệt hoặc chưa duyệt không ạ?"`,
        `admin_clinic_not_found_${ctx.queryClinic}`,
      );
    if (!ctx.clinic)
      return result(
        `⚠️ KHÔNG CÓ DỮ LIỆU.`,
        `Thông báo lỗi không xác định.`,
        "admin_no_clinic_data",
      );
    const c = ctx.clinic;
    const statusMap = {
      pending: "Chờ duyệt",
      contacted: "Đã liên hệ",
      resolved: "Đã duyệt",
      rejected: "Từ chối",
      locked: "Đã khóa",
      deleted: "Đã xóa",
    };
    return result(
      `🏥 **THÔNG TIN CHI TIẾT BỆNH VIỆN**\n\n📛 **Tên:** ${c.clinicName}\n📍 **Địa chỉ:** ${c.address || "Chưa cập nhật"}\n📞 **Điện thoại:** ${c.phone || "Chưa cập nhật"}\n📧 **Email:** ${c.email || "Chưa cập nhật"}\n👤 **Người đại diện:** ${c.representativeName || "Chưa cập nhật"}\n🏢 **Loại hình:** ${c.clinicType || "Chưa cập nhật"}\n✅ **Trạng thái:** ${statusMap[c.status] || c.status}`,
      `Trình bày chi tiết rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem danh sách bác sĩ của bệnh viện này không ạ?"`,
      `clinic_details_${c.clinicName.replace(/\s/g, "_")}`,
    );
  },

  total_appointment_stats: (ctx) => {
    if (ctx.stats?.total === undefined)
      return result(
        `⚠️ KHÔNG CÓ DỮ LIỆU LỊCH HẸN.`,
        `Thông báo chưa có lịch hẹn nào trên hệ thống.`,
        "admin_no_appointments",
      );
    return result(
      `📊 **THỐNG KÊ LỊCH HẸN TOÀN HỆ THỐNG**\n\n${formatApptStats(ctx.stats)}`,
      `Trình bày thống kê rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem chi tiết theo từng trạng thái hoặc lọc theo bác sĩ/phòng khám không ạ?"`,
      `total_appointments_${ctx.stats.total}`,
    );
  },

  appointment_stats_by_time: (ctx) => {
    if (ctx.error === "INVALID_TIME_RANGE")
      return result(
        `⚠️ KHOẢNG THỜI GIAN KHÔNG HỢP LỆ.`,
        `Thông báo và yêu cầu admin chọn lại (hôm nay, hôm qua, tuần này, ...).`,
        "admin_invalid_time_range",
      );
    if (ctx.stats?.total === undefined)
      return result(
        `⚠️ KHÔNG CÓ LỊCH HẸN TRONG KHOẢNG THỜI GIAN NÀY.`,
        `Thông báo không có dữ liệu.`,
        "admin_no_appointments_in_range",
      );
    return result(
      `📊 **THỐNG KÊ LỊCH HẸN – ${TIME_LABEL_MAP[ctx.timeRange] || ctx.timeRange}**\n\n${formatApptStats(ctx.stats)}`,
      `Trình bày thống kê rõ ràng. Sau đó hỏi: "Anh/chị có muốn xem chi tiết hơn theo bác sĩ hoặc phòng khám không ạ?"`,
      `appointment_stats_${ctx.timeRange}_${ctx.stats.total}`,
    );
  },

  total_revenue_stats: (ctx) => {
    if (ctx.stats?.totalRevenue === undefined)
      return result(
        `⚠️ KHÔNG CÓ DỮ LIỆU DOANH THU.`,
        `Thông báo chưa có giao dịch nào.`,
        "admin_no_revenue",
      );
    const s = ctx.stats;
    return result(
      `📊 **THỐNG KÊ DOANH THU & LỢI NHUẬN TOÀN HỆ THỐNG**\n\n💰 Tổng doanh thu từ bệnh nhân: **${formatCurrency(s.totalRevenue)}**\n🧾 Tổng số giao dịch: **${formatNumber(s.totalTransactions)}**\n📊 Trung bình/giao dịch: **${formatCurrency(s.averageRevenue)}**\n\n📌 **Phân chia lợi nhuận (từ các ca hoàn thành):**\n- 🏢 **Hệ thống nhận:** ${formatCurrency(s.totalPlatformRevenue)}\n- 🏥 **Bệnh viện/Phòng khám nhận:** ${formatCurrency(s.totalClinicRevenue)}\n\n💳 **Theo phương thức thanh toán:**\n- Online: ${formatCurrency(s.onlineRevenue)} (${s.onlineCount} GD)\n- Offline: ${formatCurrency(s.offlineRevenue)} (${s.offlineCount} GD)`,
      `Trình bày số liệu rõ ràng. Hỏi thêm: "Anh/chị có muốn xem chi tiết theo từng phương thức thanh toán hoặc lọc theo thời gian không ạ?"`,
      `total_revenue_${s.totalRevenue}`,
    );
  },

  revenue_stats_by_time: (ctx) => {
    if (ctx.error === "INVALID_TIME_RANGE")
      return result(
        `⚠️ KHOẢNG THỜI GIAN KHÔNG HỢP LỆ.`,
        `Thông báo và yêu cầu admin chọn lại (hôm nay, hôm qua, tuần này, ...).`,
        "admin_invalid_time_range",
      );
    if (ctx.stats?.totalRevenue === undefined)
      return result(
        `⚠️ KHÔNG CÓ DỮ LIỆU DOANH THU TRONG KHOẢNG ${(ctx.timeRange || "NÀY").toUpperCase()}.`,
        `Thông báo chưa có giao dịch nào.`,
        `no_revenue_${ctx.timeRange || "unknown"}`,
      );
    const s = ctx.stats;
    return result(
      `📊 **THỐNG KÊ DOANH THU - ${TIME_LABEL_MAP[ctx.timeRange] || ctx.timeRange?.toUpperCase() || "KHOẢNG THỜI GIAN"}**\n\n💰 Tổng doanh thu: **${formatCurrency(s.totalRevenue)}**\n🧾 Số giao dịch: **${formatNumber(s.totalTransactions)}**\n📊 Trung bình/giao dịch: **${formatCurrency(s.averageRevenue)}**\n\n💳 **Phân loại thanh toán:**\n- Online: ${formatCurrency(s.onlineRevenue)} (${s.onlineCount} GD)\n- Offline: ${formatCurrency(s.offlineRevenue)} (${s.offlineCount} GD)`,
      `Trình bày số liệu rõ ràng. Hỏi thêm: "Anh/chị có muốn so sánh với kỳ trước hoặc xem biểu đồ không ạ?"`,
      `revenue_${ctx.timeRange}_${s.totalRevenue}`,
    );
  },
  
  top_doctors_completed_appointments: (ctx) => {
    if (!ctx.topDoctors || ctx.topDoctors.length === 0) {
      return result(
        `⚠️ KHÔNG CÓ DỮ LIỆU. Hiện tại hệ thống chưa có bác sĩ nào có lịch hẹn đã hoàn thành.`,
        `Thông báo chưa có dữ liệu ca khám hoàn thành. KHÔNG BỊA ĐẶT SỐ LIỆU.`,
        `admin_no_top_doctors`,
      );
    }

    const listStr = ctx.topDoctors
      .map(
        (d, i) => `${i + 1}. **BS. ${d.doctorName}**: ${d.completedCount} ca`,
      )
      .join("\n");
    return result(
      `🏆 **TOP 5 BÁC SĨ CÓ NHIỀU LỊCH HẸN HOÀN THÀNH NHẤT**\n\n${listStr}`,
      `Thông báo em xin gửi biểu đồ Top 5 bác sĩ, và liệt kê lại danh sách bằng bullet points.`,
      `top_doctors_completed_${ctx.topDoctors.length}`,
    );
  },
};

// ===============================
// 4. MAIN EXPORT FUNCTION
// ===============================

export const buildAdminPrompt = (context) => {
  // 1. Chặn ưu tiên: Yêu cầu làm rõ (Clarification)
  if (context.requiresClarification && context.clarificationMessage) {
    return `${BASE_PERSONA}\n\n=== DỮ LIỆU THỰC TẾ ===\n⚠️ YÊU CẦU LÀM RÕ: ${context.clarificationMessage}\n\n=== CHỈ THỊ ===\nLặp lại thông báo làm rõ lịch sử. Không trả lời ngoài phạm vi.\n\n${JSON_INSTRUCTION}`;
  }

  // 2. Chặn lỗi DB toàn cục (Global Exception Interceptor)
  if (context.error === "DB_QUERY_FAILED") {
    return `${BASE_PERSONA}\n\n=== DỮ LIỆU THỰC TẾ ===\n❌ LỖI HỆ THỐNG DB.\n\n=== CHỈ THỊ ===\nThông báo lỗi tạm thời.\n\n${JSON_INSTRUCTION}`;
  }

  // 3. Xử lý logic chuẩn hóa Intent
  const payload = intentBuilders[context.intent]
    ? intentBuilders[context.intent](context)
    : {
        data: "❓ CHƯA HỖ TRỢ.",
        task: "Thông báo tính năng đang phát triển. Gợi ý tính năng đếm bác sĩ/liệt kê theo chuyên khoa hoặc bệnh viện.",
        state: "admin_unsupported_intent",
      };

  return `${BASE_PERSONA}\n\n=== DỮ LIỆU THỰC TẾ ===\n${payload.data}\n\n=== CHỈ THỊ ===\n${payload.task}\n\n${JSON_INSTRUCTION}`;
};
