import nodemailer from "nodemailer";
import logger from "./logger.js";

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
    // Khởi tạo transporter ngay tại thời điểm gọi hàm gửi mail
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Hệ thống đặt lịch khám" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      attachments, // Đẩy attachments vào thư viện nodemailer
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};
// ============================================================================
// PHẦN MỚI: HÀM TẠO KHUNG EMAIL CƠ BẢN (BASE TEMPLATE)
// ============================================================================
/**
 * Hàm này tạo ra một khung HTML chuẩn cho mọi email.
 * @param {string} title - Tiêu đề chính hiển thị trong nội dung email
 * @param {string} content - Đoạn HTML nội dung chi tiết
 * @returns {string} - Chuỗi HTML hoàn chỉnh để gửi đi
 */
const generateBaseTemplate = (title, content) => {
  const primaryColor = "#0066cc";

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">

      <!-- Vùng chứa toàn bộ email -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7f6; padding: 20px 0;">
        <tr>
          <td align="center">

            <!-- Khung nội dung chính (màu trắng) -->
            <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

              <!-- Header -->
              <tr>
                <td style="background-color: ${primaryColor}; padding: 30px 20px; text-align: center;">
                  <!-- Bạn có thể thay bằng thẻ <img> nếu có logo -->
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px;">MEDICARE SYSTEM</h1>
                </td>
              </tr>

              <!-- Body / Nội dung -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #2c3e50; font-size: 20px; margin-top: 0; margin-bottom: 20px; text-align: center;">${title}</h2>

                  <!-- Chèn nội dung động vào đây -->
                  <div style="font-size: 16px; line-height: 1.6; color: #555555;">
                    ${content}
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; color: #888888; font-size: 13px;">
                    Email này được gửi tự động từ <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>. Vui lòng không trả lời trực tiếp email này.
                  </p>
                  <p style="margin: 10px 0 0 0; color: #888888; font-size: 13px;">
                    Cần hỗ trợ? Hãy liên hệ: <a href="mailto:support@medicare.com" style="color: ${primaryColor}; text-decoration: none;">support@medicare.com</a>
                  </p>
                </td>
              </tr>

            </table>
            <!-- Kết thúc khung chính -->

            <p style="text-align: center; color: #aaaaaa; font-size: 12px; margin-top: 20px;">
              &copy; ${new Date().getFullYear()} Medicare System. All rights reserved.
            </p>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
};

// ============================================================================
// CẬP NHẬT: CÁC HÀM GỬI EMAIL CHỨC NĂNG
// ============================================================================

// 1. Hàm gửi OTP Đăng ký
export const sendVerificationOtp = async (to, otp) => {
  const subject = "Mã Xác Thực Đăng Ký Tài Khoản";
  const title = "Xác Thực Địa Chỉ Email";

  // Chỉ viết phần nội dung bên trong
  const content = `
    <p>Xin chào,</p>
    <p>Cảm ơn bạn đã tin tưởng và đăng ký tài khoản tại <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực dưới đây:</p>

    <!-- Hộp chứa mã OTP -->
    <div style="background-color: #f0f7ff; border: 1px dashed #0066cc; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0066cc;">${otp}</span>
    </div>

    <p style="margin-bottom: 5px;"><strong>Lưu ý quan trọng:</strong></p>
    <ul style="margin-top: 0; padding-left: 20px;">
      <li>Mã xác thực này chỉ có hiệu lực trong vòng <strong>10 phút</strong>.</li>
      <li>Tuyệt đối <strong>không chia sẻ</strong> mã này với bất kỳ ai để bảo vệ tài khoản của bạn.</li>
    </ul>
    <p>Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email và không cần thực hiện thêm hành động nào.</p>
    <p style="margin-top: 30px;">Trân trọng,<br><strong>Đội ngũ Medicare</strong></p>
  `;

  // Gộp nội dung vào khung cơ bản
  const html = generateBaseTemplate(title, content);

  await sendEmail(to, subject, html);
};

// 2. Hàm gửi OTP Quên mật khẩu
export const sendPasswordResetOtp = async (to, otp) => {
  const subject = "Mã Xác Thực Đặt Lại Mật Khẩu";
  const title = "Yêu Cầu Đặt Lại Mật Khẩu";

  const content = `
    <p>Xin chào,</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>.</p>
    <p>Vui lòng nhập mã xác thực gồm 6 chữ số dưới đây để tiếp tục thiết lập mật khẩu mới:</p>

    <!-- Hộp chứa mã OTP (Màu sắc hơi khác để phân biệt cảnh báo) -->
    <div style="background-color: #fff8f0; border: 1px dashed #e67e22; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e67e22;">${otp}</span>
    </div>

    <p style="margin-bottom: 5px;"><strong>Lưu ý quan trọng:</strong></p>
    <ul style="margin-top: 0; padding-left: 20px;">
      <li>Mã xác thực này sẽ hết hạn sau <strong>10 phút</strong>.</li>
      <li>Tuyệt đối <strong>không cung cấp</strong> mã này cho bất kỳ ai, kể cả nhân viên hệ thống.</li>
    </ul>
    <p>Nếu bạn không gửi yêu cầu này, có thể ai đó đang cố gắng truy cập tài khoản của bạn. Vui lòng bỏ qua email này và đảm bảo mật khẩu hiện tại của bạn đủ mạnh.</p>
    <p style="margin-top: 30px;">Trân trọng,<br><strong>Đội ngũ Security Medicare</strong></p>
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
    <p>Chúng tôi rất vui mừng thông báo: Hồ sơ đăng ký hành nghề của bạn đã vượt qua quá trình kiểm duyệt và chính thức được kích hoạt trên hệ thống <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>.</p>

    <p>Để đảm bảo quy trình, hệ thống đã tự động cấp phát cho bạn một tài khoản với thông tin như sau:</p>
    <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Tên đăng nhập (Email):</strong> ${email}</p>
      <p style="margin: 0;"><strong>Mật khẩu tạm thời:</strong> <span style="font-family: monospace; letter-spacing: 2px;">${plainPassword}</span></p>
    </div>

    <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <h3 style="color: #856404; margin-top: 0; font-size: 16px;">⚠️ YÊU CẦU BẢO MẬT BẮT BUỘC</h3>
      <p style="color: #856404; margin-bottom: 0;">Bạn <strong>KHÔNG THỂ</strong> sử dụng mật khẩu tạm thời này để đăng nhập ngay. Bạn bắt buộc phải truy cập vào đường dẫn bên dưới để thiết lập mật khẩu của riêng mình:</p>
      <div style="text-align: center; margin-top: 15px;">
        <a href="${resetLink}" style="background-color: #e67e22; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">TIẾN HÀNH ĐỔI MẬT KHẨU</a>
      </div>
    </div>

    <p>Trân trọng,<br><strong>Ban Quản Trị Hệ Thống</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

// 4. Hàm gửi thư Từ chối hồ sơ (Kèm lý do)
export const sendDoctorRejectionEmail = async (email, reason) => {
  const subject = "Thông báo: Yêu cầu bổ sung hồ sơ đối tác";
  const title = "Thông Báo Cập Nhật Hồ Sơ";

  const content = `
    <p>Xin chào Bác sĩ,</p>
    <p>Cảm ơn bạn đã quan tâm và gửi hồ sơ đăng ký hợp tác với <strong>Hệ thống Đặt Lịch Khám Bệnh</strong>.</p>
    <p>Tuy nhiên, sau quá trình kiểm duyệt, chúng tôi nhận thấy hồ sơ của bạn chưa đáp ứng đủ yêu cầu hiện tại. Dưới đây là lý do chi tiết từ Ban Quản Trị:</p>

    <div style="background-color: #fdf2f2; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; color: #c0392b;">
      <strong>Lý do:</strong> ${reason}
    </div>

    <p>Vui lòng chuẩn bị lại các tài liệu hợp lệ theo góp ý trên và tiến hành nộp lại hồ sơ mới trên website của chúng tôi.</p>
    <p>Rất mong sớm được hợp tác cùng bạn trong tương lai.</p>
    <p>Trân trọng,<br><strong>Ban Quản Trị Hệ Thống</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

// Gửi email thông tin đăng nhập cho clinic admin
export const sendClinicAdminCredentials = async (email, password) => {
  const subject = "Tài khoản quản lý phòng khám trên DocGo";
  const title = "Chào mừng bạn đến với DocGo!";

  const content = `
    <p>Xin chào,</p>
    <p>Tài khoản quản lý phòng khám của bạn đã được tạo thành công.</p>
    <p>Vui lòng sử dụng thông tin dưới đây để đăng nhập vào hệ thống:</p>

    <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Email đăng nhập:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Mật khẩu tạm thời:</strong> <span style="font-family: monospace; letter-spacing: 2px;">${password}</span></p>
    </div>

    <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <h3 style="color: #856404; margin-top: 0; font-size: 16px;">⚠️ YÊU CẦU BẢO MẬT</h3>
      <p style="color: #856404; margin-bottom: 0;">Bạn <strong>KHÔNG THỂ</strong> sử dụng mật khẩu tạm thời này để đăng nhập lâu dài. Sau lần đăng nhập đầu tiên, hệ thống sẽ yêu cầu bạn đổi mật khẩu mới.</p>
    </div>

    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

// Gửi email thông báo bác sĩ đã được phòng khám xác nhận, chờ admin duyệt
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
    <p>Hồ sơ đang được chuyển đến đội ngũ quản trị nền tảng để kiểm duyệt lần cuối. Bạn sẽ nhận được thông báo khi có kết quả.</p>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;
  const html = generateBaseTemplate(title, content);
  await sendEmail(email, subject, html);
};

export const sendAppointmentConfirmation = async (to, appointmentData) => {
  const subject = "Xác nhận đặt lịch khám";
  const title = "Đặt lịch thành công";

  const content = `
    <p>Xin chào <strong>${appointmentData.patientName}</strong>,</p>
    <p>Bạn đã đặt lịch khám với <strong>${appointmentData.doctorName}</strong> thành công.</p>
    <p><strong>Thông tin chi tiết:</strong></p>
    <ul>
      <li>Ngày khám: ${new Date(appointmentData.date).toLocaleDateString("vi-VN")}</li>
      <li>Giờ khám: ${appointmentData.time}</li>
      <li>Bác sĩ: ${appointmentData.doctorName}</li>
    </ul>
    <p>Vui lòng sử dụng mã QR bên dưới để check-in tại bệnh viện:</p>
    <div style="text-align: center; margin: 20px 0;">
      <img src="${appointmentData.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
    </div>
    <p>Lưu ý: Vui lòng đến đúng giờ và mang theo CCCD để xác thực.</p>
    <p>Trân trọng,<br><strong>Đội ngũ DocGo</strong></p>
  `;

  const html = generateBaseTemplate(title, content);
  await sendEmail(to, subject, html);
};