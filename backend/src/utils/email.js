import nodemailer from "nodemailer";
import logger from "./logger.js";
import { generatePDFFromHTML } from "./pdf.js";
import { generatePrescriptionHTML } from "./prescriptionTemplate.js";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// MASTER DEV FIX: Bổ sung tham số thứ 4 là attachments (mặc định mảng rỗng)
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Hệ thống đặt lịch khám" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

// ============================================================================
// TEMPLATE EMAIL CHUẨN DOANH NGHIỆP – RESPONSIVE
// ============================================================================
/**
 * Tạo khung HTML chuyên nghiệp cho mọi email.
 * @param {string} title - Tiêu đề chính hiển thị trong nội dung
 * @param {string} content - HTML nội dung chi tiết
 * @returns {string} - Chuỗi HTML hoàn chỉnh
 */
const generateBaseTemplate = (title, content) => {
  const primaryColor = process.env.EMAIL_PRIMARY_COLOR || "#0066cc";
  const secondaryColor = "#2c3e50";
  const bgColor = "#f4f7f6";
  const textColor = "#333333";
  const footerBg = "#f8f9fa";
  const borderColor = "#e9ecef";

  // CSS inline + media queries
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .inner-padding { padding: 20px 20px !important; }
      .header-padding { padding: 20px 20px !important; }
      .footer-padding { padding: 15px 20px !important; }
      .otp-box { font-size: 26px !important; letter-spacing: 4px !important; padding: 12px !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
      h1 { font-size: 20px !important; }
      h2 { font-size: 18px !important; }
      p, li { font-size: 14px !important; line-height: 1.5 !important; }
      .logo-text { font-size: 18px !important; }
      .qr-code img { width: 140px !important; height: auto !important; }
    }
    @media only screen and (min-width: 601px) {
      .container { max-width: 600px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${bgColor}; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; color:${textColor}; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bgColor}; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.05);">
          <!-- HEADER -->
          <tr>
            <td class="header-padding" style="background: linear-gradient(135deg, ${primaryColor} 0%, #004c99 100%); padding: 28px 30px; text-align: center;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:600; letter-spacing:1px;">DOCGO SYSTEM</h1>
              <p style="margin:8px 0 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Nền tảng y tế thông minh</p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td class="inner-padding" style="padding:40px 35px;">
              <h2 style="margin:0 0 20px 0; color:${secondaryColor}; font-size:22px; font-weight:600; text-align:center;">${title}</h2>
              <div style="font-size:15px; line-height:1.6; color:#555555;">
                ${content}
              </div>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td class="footer-padding" style="background-color:${footerBg}; padding:20px 30px; text-align:center; border-top:1px solid ${borderColor};">
              <p style="margin:0 0 8px 0; color:#6c757d; font-size:13px;">
                <strong>DocGo – Hệ thống quản lý phòng khám và đặt lịch khám trực tuyến</strong>
              </p>
              <p style="margin:0 0 8px 0; color:#6c757d; font-size:12px;">
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
              <p style="margin:0; color:#6c757d; font-size:12px;">
                Cần hỗ trợ? <a href="mailto:support@docgo.vn" style="color:${primaryColor}; text-decoration:none;">support@docgo.vn</a> – Hotline: 1900 1234
              </p>
            </td>
          </tr>
        </table>
        <!-- COPYRIGHT -->
        <p style="text-align:center; color:#adb5bd; font-size:12px; margin:20px 0 0 0;">
          &copy; ${new Date().getFullYear()} DocGo. Tất cả các quyền được bảo lưu.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
// ============================================================================
// CÁC HÀM GỬI EMAIL CHỨC NĂNG (nội dung được cập nhật style nhẹ)
// ============================================================================

export const sendVerificationOtp = async (to, otp) => {
  const subject = "Mã Xác Thực Đăng Ký Tài Khoản";
  const title = "Xác Thực Địa Chỉ Email";

  const content = `
    <p>Xin chào,</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất đăng ký:</p>
    <div style="background-color:#f0f7ff; border:1px dashed ${process.env.EMAIL_PRIMARY_COLOR || "#0066cc"}; border-radius:12px; padding:20px; text-align:center; margin:24px 0;">
      <span style="font-size:32px; font-weight:700; letter-spacing:6px; color:${process.env.EMAIL_PRIMARY_COLOR || "#0066cc"};">${otp}</span>
    </div>
    <p style="margin-bottom:4px;"><strong>Lưu ý quan trọng:</strong></p>
    <ul style="margin-top:0; padding-left:20px;">
      <li>Mã xác thực có hiệu lực trong <strong>10 phút</strong>.</li>
      <li>Tuyệt đối <strong>không chia sẻ</strong> mã này với bất kỳ ai.</li>
    </ul>
    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
    <p style="margin-top:30px;">Trân trọng,<br><strong>Đội ngũ Medicare</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(to, subject, html);
};

export const sendPasswordResetOtp = async (to, otp) => {
  const subject = "Mã Xác Thực Đặt Lại Mật Khẩu";
  const title = "Yêu Cầu Đặt Lại Mật Khẩu";

  const content = `
    <p>Xin chào,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
    <p>Vui lòng nhập mã xác thực dưới đây để tiếp tục:</p>
    <div style="background-color:#fff8f0; border:1px dashed #e67e22; border-radius:12px; padding:20px; text-align:center; margin:24px 0;">
      <span style="font-size:32px; font-weight:700; letter-spacing:6px; color:#e67e22;">${otp}</span>
    </div>
    <p><strong>Lưu ý:</strong> Mã có hiệu lực 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email và đảm bảo tài khoản của bạn an toàn.</p>
    <p style="margin-top:30px;">Trân trọng,<br><strong>Đội ngũ Bảo mật Medicare</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(to, subject, html);
};

export const sendDoctorApprovalEmail = async (email, plainPassword) => {
  const subject = "Chúc mừng! Hồ sơ đối tác của bạn đã được duyệt";
  const title = "Chào Mừng Gia Nhập Hệ Thống";
  const resetLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/forgot-password`;

  const content = `
    <p>Xin chào Bác sĩ,</p>
    <p>Hồ sơ đăng ký hành nghề của bạn đã được duyệt và kích hoạt trên hệ thống.</p>
    <p>Hệ thống đã cấp cho bạn tài khoản:</p>
    <div style="background-color:#f8f9fa; border-left:4px solid ${process.env.EMAIL_PRIMARY_COLOR || "#0066cc"}; padding:16px; margin:20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Email đăng nhập:</strong> ${email}</p>
      <p style="margin:0;"><strong>Mật khẩu tạm thời:</strong> <code style="background:#e9ecef; padding:2px 6px; border-radius:4px;">${plainPassword}</code></p>
    </div>
    <div style="background-color:#fff3cd; border:1px solid #ffeeba; border-radius:12px; padding:16px; margin:20px 0;">
      <strong style="color:#856404;">⚠️ YÊU CẦU BẮT BUỘC</strong>
      <p style="margin:8px 0 0 0; color:#856404;">Bạn <strong>KHÔNG THỂ</strong> sử dụng mật khẩu tạm thời này để đăng nhập. Vui lòng truy cập đường dẫn bên dưới để đặt mật khẩu mới:</p>
      <div style="text-align:center; margin-top:16px;">
        <a href="${resetLink}" style="background-color:#e67e22; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:600; display:inline-block;">ĐỔI MẬT KHẨU NGAY</a>
      </div>
    </div>
    <p>Trân trọng,<br><strong>Ban Quản Trị Hệ Thống</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

export const sendDoctorRejectionEmail = async (email, reason) => {
  const subject = "Thông báo: Yêu cầu bổ sung hồ sơ đối tác";
  const title = "Thông Báo Cập Nhật Hồ Sơ";

  const content = `
    <p>Xin chào Bác sĩ,</p>
    <p>Cảm ơn bạn đã quan tâm hợp tác với <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>.</p>
    <p>Sau quá trình kiểm duyệt, hồ sơ của bạn chưa đáp ứng yêu cầu. Lý do chi tiết:</p>
    <div style="background-color:#fdf2f2; border-left:4px solid #e74c3c; padding:16px; margin:20px 0; color:#c0392b;">
      <strong>Lý do:</strong> ${reason}
    </div>
    <p>Vui lòng chuẩn bị lại hồ sơ hợp lệ và nộp lại trên website.</p>
    <p>Trân trọng,<br><strong>Ban Quản Trị Hệ Thống</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

export const sendClinicAdminCredentials = async (email, password) => {
  const subject = "Tài khoản quản lý phòng khám trên DocGo";
  const title = "Chào mừng bạn đến với DocGo!";

  const content = `
    <p>Xin chào,</p>
    <p>Tài khoản quản lý phòng khám của bạn đã được tạo thành công.</p>
    <div style="background-color:#f8f9fa; border-left:4px solid ${process.env.EMAIL_PRIMARY_COLOR || "#0066cc"}; padding:16px; margin:20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Email đăng nhập:</strong> ${email}</p>
      <p style="margin:0;"><strong>Mật khẩu tạm thời:</strong> <code style="background:#e9ecef; padding:2px 6px; border-radius:4px;">${password}</code></p>
    </div>
    <div style="background-color:#fff3cd; border:1px solid #ffeeba; border-radius:12px; padding:16px; margin:20px 0;">
      <strong style="color:#856404;">⚠️ YÊU CẦU BẢO MẬT</strong>
      <p style="margin:8px 0 0 0; color:#856404;">Bạn <strong>KHÔNG THỂ</strong> sử dụng mật khẩu tạm thời này để đăng nhập lâu dài. Sau lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới.</p>
    </div>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

export const sendDoctorClinicApproved = async (
  email,
  doctorName,
  clinicName,
) => {
  const subject = "Hồ sơ bác sĩ đã được phòng khám xác nhận";
  const title = "Xác nhận từ phòng khám";

  const content = `
    <p>Xin chào Bác sĩ ${doctorName},</p>
    <p>Hồ sơ đăng ký của bạn tại <strong>${clinicName}</strong> đã được xác nhận.</p>
    <p>Hồ sơ đang được chuyển đến đội ngũ quản trị để kiểm duyệt lần cuối. Bạn sẽ nhận được thông báo khi có kết quả.</p>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

export const sendAppointmentConfirmation = async (to, appointmentData) => {
  const subject = "Xác nhận đặt lịch khám";
  const title = "Đặt lịch thành công";

  let qrBuffer = null;
  if (
    appointmentData.qrCodeUrl &&
    appointmentData.qrCodeUrl.startsWith("data:image/png;base64,")
  ) {
    const base64Data = appointmentData.qrCodeUrl.split(",")[1];
    qrBuffer = Buffer.from(base64Data, "base64");
  }

  const content = `
    <p>Xin chào <strong>${appointmentData.patientName}</strong>,</p>
    <p>Bạn đã đặt lịch khám với <strong>${appointmentData.doctorName}</strong> thành công.</p>
    <p><strong>Thông tin chi tiết:</strong></p>
    <ul>
      <li>Ngày khám: ${new Date(appointmentData.date).toLocaleDateString("vi-VN")}</li>
      <li>Giờ khám: ${appointmentData.time}</li>
      <li>Bác sĩ: ${appointmentData.doctorName}</li>
    </ul>
    <p>Vui lòng sử dụng mã QR bên dưới để check-in tại cơ sở y tế:</p>
    <div style="text-align: center; margin: 24px 0;">
      <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px; border-radius: 12px;" />
    </div>
    <p>Lưu ý: Vui lòng đến đúng giờ và mang theo CCCD để xác thực.</p>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  const attachments = qrBuffer
    ? [{ filename: "qrcode.png", content: qrBuffer, cid: "qrcode" }]
    : [];

  await sendEmail(to, subject, html, attachments);
};

export const sendRefundNotification = async (to, data) => {
  const subject = "Thông báo hủy lịch khám";
  const title = "Xác nhận hủy lịch hẹn";

  const content = `
    <p>Xin chào <strong>${data.patientName}</strong>,</p>
    <p>Lịch khám với <strong>${data.doctorName}</strong> vào lúc <strong>${data.time}</strong> ngày <strong>${new Date(data.date).toLocaleDateString("vi-VN")}</strong> đã được hủy thành công.</p>
    ${data.refundAmount > 0 ? `<p>Số tiền hoàn lại: <strong>${data.refundAmount.toLocaleString()} VNĐ</strong> sẽ được trả về tài khoản của bạn trong vòng 3-5 ngày làm việc.</p>` : "<p>Do hủy lịch, bạn không được hoàn tiền.</p>"}
    <p>Lý do hủy: ${data.reason}</p>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(to, subject, html);
};

export const sendPrescriptionEmail = async (appointmentId, consultationId) => {
  try {
    // 1. Lấy dữ liệu đầy đủ
    const mongoose = (await import("mongoose")).default;
    const Appointment = (await import("../models/Appointment.js")).default;
    const MedicalConsultation = (
      await import("../models/MedicalConsultation.js")
    ).default;
    const User = (await import("../models/User.js")).default;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "fullName specialty")
      .populate("patientProfile", "fullName email phone")
      .populate({
        path: "slot",
        populate: { path: "scheduleId", select: "date" },
      })
      .lean();

    if (!appointment) {
      console.error(
        `Không tìm thấy appointment ${appointmentId} để gửi đơn thuốc`,
      );
      return;
    }

    const consultation =
      await MedicalConsultation.findById(consultationId).lean();
    if (!consultation) {
      console.error(`Không tìm thấy consultation ${consultationId}`);
      return;
    }

    const user = await User.findById(appointment.bookingUser)
      .select("email fullName")
      .lean();
    if (!user?.email) {
      console.warn(`Không có email cho user ${appointment.bookingUser}`);
      return;
    }

    // Kiểm tra populated fields
    if (!appointment.doctor) {
      console.warn(
        `Không có thông tin doctor cho appointment ${appointmentId}`,
      );
      return;
    }
    if (!appointment.patientProfile) {
      console.warn(
        `Không có thông tin patientProfile cho appointment ${appointmentId}`,
      );
      return;
    }
    if (!appointment.slot) {
      console.warn(`Không có thông tin slot cho appointment ${appointmentId}`);
      return;
    }
    if (!appointment.slot.scheduleId) {
      console.warn(
        `Không có thông tin scheduleId cho appointment ${appointmentId}`,
      );
      return;
    }

    // 2. Tạo HTML và PDF
    const html = generatePrescriptionHTML(consultation, appointment);
    const pdfBuffer = await generatePDFFromHTML(html);

    // 3. Xây dựng nội dung email chi tiết, chuyên nghiệp
    const subject = "📄 Kết quả khám bệnh và đơn thuốc điện tử";
    const title = "Hoàn thành khám bệnh";

    // Helper định dạng ngày giờ
    const formatDate = (date) => new Date(date).toLocaleDateString("vi-VN");
    const formatTime = (timeStr) => timeStr || "---";

    const doctorName = appointment.doctor?.fullName || "Bác sĩ";
    const clinicName = "Cơ sở y tế"; // Appointment schema không chứa clinicId
    const appointmentDate = appointment.slot?.scheduleId?.date
      ? formatDate(appointment.slot.scheduleId.date)
      : formatDate(appointment.completedAt || new Date());
    const appointmentTime = `${formatTime(appointment.slot?.startTime)} - ${formatTime(appointment.slot?.endTime)}`;

    const content = `
      <p style="margin-bottom: 20px;">Xin chào <strong>${user.fullName || "Quý khách"}</strong>,</p>

      <div style="background: #f0f9ff; border-radius: 16px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0;"><strong>🧑‍⚕️ Bác sĩ thực hiện:</strong> ${doctorName}</p>
        <p style="margin: 0 0 8px 0;"><strong>🏥 Cơ sở:</strong> ${clinicName}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Ngày khám:</strong> ${appointmentDate}</p>
        <p style="margin: 0;"><strong>⏰ Giờ khám:</strong> ${appointmentTime}</p>
      </div>

      <p>Bác sĩ <strong>${doctorName}</strong> đã hoàn thành ca khám cho bạn. Kết quả chẩn đoán và đơn thuốc chi tiết được đính kèm trong file PDF dưới đây.</p>

      <div style="background: #e6f7e6; border-left: 4px solid #2e7d32; padding: 16px; border-radius: 12px; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600;">📎 File đính kèm: <span style="color: #2e7d32;">Đơn_thuốc_${appointmentId.slice(-6)}.pdf</span></p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Vui lòng mở file để xem chi tiết toa thuốc và hướng dẫn sử dụng.</p>
      </div>

      <p><strong>Lưu ý quan trọng:</strong></p>
      <ul style="margin: 8px 0 16px 20px;">
        <li>Đơn thuốc có giá trị pháp lý, vui lòng tuân thủ chỉ định của bác sĩ.</li>
        <li>Nếu có bất kỳ thắc mắc nào về đơn thuốc, hãy liên hệ trực tiếp với cơ sở y tế.</li>
        <li>Bạn có thể tái khám theo lịch hẹn được ghi trong đơn thuốc.</li>
      </ul>

      <p>Trân trọng cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi.</p>
      <p style="margin-top: 24px;">Chúc bạn sức khỏe!<br><strong>Đội ngũ DocGo</strong></p>
    `;

    const htmlEmail = generateBaseTemplate(title, content);

    // 4. Gửi email với attachment
    await sendEmail(user.email, subject, htmlEmail, [
      {
        filename: `Don_thuoc_${appointmentId.slice(-6)}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ]);

    console.log(
      `Đã gửi đơn thuốc PDF cho appointment ${appointmentId} đến ${user.email}`,
    );
  } catch (error) {
    console.error(
      `Lỗi gửi email đơn thuốc cho appointment ${appointmentId}:`,
      error,
    );
    // Không throw lỗi để không ảnh hưởng đến việc hoàn thành ca khám
  }
};
