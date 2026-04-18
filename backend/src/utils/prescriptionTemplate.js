import dayjs from "dayjs";

export const generatePrescriptionHTML = (consultation, appointment) => {
  const doctor = appointment.doctor;
  const patient = appointment.patientId;
  const slot = appointment.slot;
  const schedule = slot?.scheduleId || {};
  const consultationDate = appointment.completedAt || new Date();

  const formatCurrency = (amount) => {
    return amount?.toLocaleString("vi-VN") + " đ";
  };

  const prescriptionRows = (consultation.prescription || [])
    .map(
      (med, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; text-align: center;">${idx + 1}</td>
      <td style="padding: 12px 8px; font-weight: 500;">${med.drugName || ""}</td>
      <td style="padding: 12px 8px;">${med.dosage || ""}</td>
      <td style="padding: 12px 8px;">${med.instructions || ""}</td>
      <td style="padding: 12px 8px;">${med.duration || ""}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Đơn thuốc điện tử</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      margin: 0;
    }
    .prescription-card {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 12px 30px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f2c59 0%, #1a4a7a 100%);
      color: white;
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.85;
    }
    .content {
      padding: 30px 40px;
    }
    .info-grid {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .info-item {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .info-label {
      font-weight: 600;
      color: #2c3e50;
      width: 110px;
      flex-shrink: 0;
    }
    .info-value {
      color: #1e293b;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #0f2c59;
      border-left: 5px solid #0f2c59;
      padding-left: 15px;
      margin: 25px 0 20px;
    }
    .prescription-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .prescription-table th {
      background: #eef2ff;
      color: #1e293b;
      padding: 12px 8px;
      font-weight: 600;
      font-size: 14px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    .prescription-table td {
      padding: 12px 8px;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .prescription-table th:first-child,
    .prescription-table td:first-child {
      text-align: center;
      width: 50px;
    }
    .instructions-box {
      background: #fff9e6;
      border-left: 4px solid #f5b042;
      padding: 15px 20px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .follow-up {
      background: #e6f7ff;
      border-left: 4px solid #1890ff;
      padding: 12px 20px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .signature {
      display: flex;
      justify-content: space-between;
      margin: 40px 0 20px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-item {
      text-align: center;
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #1e293b;
      margin-top: 50px;
      padding-top: 8px;
      width: 100%;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .content { padding: 20px; }
      .info-grid { grid-template-columns: 1fr; gap: 8px; }
      .info-label { width: 100%; margin-bottom: 4px; }
      .signature { flex-direction: column; gap: 30px; }
      .signature-item { width: 100%; }
      .prescription-table th, .prescription-table td { font-size: 12px; padding: 8px 4px; }
    }
  </style>
</head>
<body>
  <div class="prescription-card">
    <div class="header">
      <h1>ĐƠN THUỐC ĐIỆN TỬ</h1>
      <p>Prescription · Mã số: ${consultation._id.toString().slice(-6) || "000000"}</p>
    </div>
    <div class="content">
      <!-- Thông tin bệnh nhân -->
      <div class="info-grid">
        <div class="info-item"><span class="info-label">Họ tên:</span><span class="info-value"><strong>${patient?.fullName || "Không có thông tin"}</strong></span></div>
        <div class="info-item"><span class="info-label">Số điện thoại:</span><span class="info-value">${patient?.phone || "---"}</span></div>
        <div class="info-item"><span class="info-label">Ngày khám:</span><span class="info-value">${dayjs(consultationDate).format("DD/MM/YYYY")}</span></div>
        <div class="info-item"><span class="info-label">Giờ khám:</span><span class="info-value">${slot?.startTime || ""} - ${slot?.endTime || ""}</span></div>
        <div class="info-item"><span class="info-label">Bác sĩ:</span><span class="info-value"><strong>${doctor?.fullName || "Bác sĩ"}</strong> ${doctor?.specialty?.name ? `- ${doctor.specialty.name}` : ""}</span></div>
        <div class="info-item"><span class="info-label">Chẩn đoán:</span><span class="info-value">${consultation.diagnosis || ""}</span></div>
      </div>

      <!-- Đơn thuốc -->
      <div class="section-title">ĐƠN THUỐC</div>
      ${
        consultation.prescription?.length
          ? `
      <table class="prescription-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên thuốc</th>
            <th>Liều dùng</th>
            <th>Cách dùng</th>
            <th>Thời gian</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptionRows}
        </tbody>
      </table>
      `
          : "<p><em>Không có thuốc được kê.</em></p>"
      }

      ${
        consultation.instructions
          ? `
      <div class="instructions-box">
        <strong style="display:block; margin-bottom:8px;">📋 Hướng dẫn của bác sĩ</strong>
        ${consultation.instructions}
      </div>
      `
          : ""
      }

      ${
        consultation.followUpDate
          ? `
      <div class="follow-up">
        <strong style="display:block; margin-bottom:4px;">🔄 Ngày tái khám dự kiến</strong>
        ${dayjs(consultation.followUpDate).format("DD/MM/YYYY")}
      </div>
      `
          : ""
      }

      <!-- Chữ ký -->
      <div class="signature">
        <div class="signature-item">
          <div class="signature-line">Bệnh nhân</div>
          <div style="margin-top: 8px;">(Ký, ghi rõ họ tên)</div>
        </div>
        <div class="signature-item">
          <div class="signature-line">Bác sĩ</div>
          <div style="margin-top: 8px;">${doctor?.fullName || "Bác sĩ"}</div>
        </div>
      </div>

      <div class="footer">
        Đây là đơn thuốc điện tử có giá trị pháp lý. Vui lòng mang theo khi đi khám lại.
      </div>
    </div>
  </div>
</body>
</html>`;
};
