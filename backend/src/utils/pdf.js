import html_to_pdf from "html-pdf-node";

export const generateContractPDF = async (clinicData) => {
  if (!clinicData) {
    throw new Error("Không có dữ liệu phòng khám để tạo hợp đồng.");
  }

  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  const cName =
    clinicData?.clinicName ||
    "...............................................................";
  const cAddress =
    clinicData?.address ||
    "...............................................................";
  const cRep =
    clinicData?.representativeName ||
    "...............................................................";
  const cPhone = clinicData?.phone || "..............................";
  const cEmail = clinicData?.email || "..............................";
  const cTaxCode = clinicData?.taxCode || "..............................";

  const primaryColor = "#0f2c59";

  const templateHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        body {
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #1e293b;
          margin: 0;
          padding: 25mm 28mm 25mm 30mm;
          background: white;
          position: relative;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 80pt;
          color: rgba(15, 44, 89, 0.03);
          font-weight: bold;
          white-space: nowrap;
          z-index: -1;
          pointer-events: none;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid ${primaryColor};
          padding-bottom: 12px;
          margin-bottom: 25px;
        }
        .company {
          font-weight: 700;
          font-size: 13pt;
          color: ${primaryColor};
        }
        .motto {
          text-align: right;
          font-style: italic;
        }
        .motto p {
          margin: 2px 0;
        }
        .contract-title {
          text-align: center;
          color: ${primaryColor};
          font-size: 20pt;
          font-weight: 700;
          text-transform: uppercase;
          margin: 30px 0 10px;
        }
        .contract-no {
          text-align: center;
          font-size: 12pt;
          color: #4b5563;
          margin-bottom: 30px;
        }
        .base-on {
          background: #f8fafc;
          padding: 15px 20px;
          border-radius: 12px;
          margin: 20px 0;
          font-size: 11pt;
          border-left: 4px solid ${primaryColor};
        }
        .party-title {
          font-weight: 700;
          font-size: 14pt;
          color: ${primaryColor};
          margin: 25px 0 15px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0 20px;
        }
        .info-table td {
          padding: 6px 8px;
          vertical-align: top;
        }
        .col-label {
          width: 140px;
          font-weight: 600;
          color: #334155;
        }
        .article {
          margin: 20px 0;
          text-align: justify;
        }
        .article-title {
          font-weight: 700;
          font-size: 13pt;
          color: ${primaryColor};
          margin-bottom: 8px;
        }
        .signature-section {
          width: 100%;
          margin-top: 50px;
          page-break-inside: avoid;
        }
        .signature-section td {
          width: 50%;
          text-align: center;
          vertical-align: top;
          padding: 0 10px;
        }
        .sign-title {
          font-weight: 700;
          margin-bottom: 5px;
        }
        .sign-subtitle {
          font-size: 11pt;
          margin-bottom: 70px;
        }
        .footer-note {
          text-align: center;
          font-size: 9pt;
          color: #6c757d;
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }
        @media print {
          body { margin: 0; padding: 20mm; }
          .watermark { opacity: 0.2; }
        }
      </style>
    </head>
    <body>
      <div class="watermark">DOCGO SYSTEM</div>
      <div class="header">
        <div class="company">CÔNG TY CỔ PHẦN DOCGO</div>
        <div class="motto">
          <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p><strong>Độc lập – Tự do – Hạnh phúc</strong></p>
        </div>
      </div>

      <div style="text-align: right; margin-bottom: 20px;">
        Hà Nội, ngày ${day} tháng ${month} năm ${year}
      </div>

      <div class="contract-title">HỢP ĐỒNG HỢP TÁC CUNG CẤP DỊCH VỤ</div>
      <div class="contract-no">Số: ${Date.now().toString().slice(-6)}/HĐHT/DOCGO-${year}</div>

      <div class="base-on">
        <strong>Căn cứ:</strong><br/>
        - Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;<br/>
        - Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;<br/>
        - Nhu cầu và khả năng hợp tác của hai bên.
      </div>

      <div>Hôm nay, ngày ${day}/${month}/${year}, chúng tôi gồm có:</div>

      <div class="party-title">BÊN A: CÔNG TY CỔ PHẦN CÔNG NGHỆ Y TẾ DOCGO</div>
      <table class="info-table">
        <tr><td class="col-label">Mã số thuế:</td><td><strong>0123456789</strong></td></tr>
        <tr><td class="col-label">Địa chỉ:</td><td>182 Lê Duẩn, phường Trường Vinh, Nghệ An</td></tr>
        <tr><td class="col-label">Đại diện bởi:</td><td><strong>Ông Lê Đình Anh</strong> – Giám đốc</td></tr>
        <tr><td class="col-label">Điện thoại:</td><td>1900 1234</td></tr>
        <tr><td class="col-label">Email:</td><td>partners@docgo.vn</td></tr>
      </table>

      <div class="party-title">BÊN B: CƠ SỞ Y TẾ / PHÒNG KHÁM</div>
      <table class="info-table">
        <tr><td class="col-label">Tên cơ sở:</td><td><strong>${cName}</strong></td></tr>
        <tr><td class="col-label">Địa chỉ:</td><td>${cAddress}</td></tr>
        <tr><td class="col-label">Người đại diện:</td><td><strong>${cRep}</strong></td></tr>
        <tr><td class="col-label">Số điện thoại:</td><td>${cPhone}</td></tr>
        <tr><td class="col-label">Email:</td><td>${cEmail}</td></tr>
        <tr><td class="col-label">Mã số thuế:</td><td>${cTaxCode}</td></tr>
      </table>

      <div><em>Sau khi bàn bạc, hai bên đồng ý ký kết Hợp đồng hợp tác với các điều khoản sau:</em></div>

      <div class="article">
        <div class="article-title">ĐIỀU 1: NỘI DUNG HỢP TÁC</div>
        Bên A cung cấp giải pháp công nghệ (Hệ thống DocGo) để Bên B đưa dịch vụ y tế lên nền tảng trực tuyến, hỗ trợ đặt lịch khám và quản lý bệnh nhân.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 2: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
        - Đảm bảo hệ thống hoạt động ổn định, an toàn, bảo mật thông tin.<br/>
        - Hỗ trợ kỹ thuật 24/7 cho Bên B.<br/>
        - Cung cấp báo cáo thống kê định kỳ.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
        - Cung cấp chính xác thông tin dịch vụ, bác sĩ, giá khám, thời gian làm việc.<br/>
        - Đảm bảo chất lượng dịch vụ y tế theo đúng cam kết.<br/>
        - Chịu trách nhiệm chuyên môn y tế.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 4: ĐIỀU KHOẢN CHUNG</div>
        - Hợp đồng có hiệu lực kể từ ngày ký, thời hạn 01 năm.<br/>
        - Mọi tranh chấp được giải quyết qua thương lượng; nếu không thành sẽ đưa ra Tòa án có thẩm quyền tại Hà Nội.<br/>
        - Hợp đồng lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau.
      </div>

      <table class="signature-section">
        <tr>
          <td>
            <div class="sign-title">ĐẠI DIỆN BÊN B</div>
            <div class="sign-subtitle">(Ký, ghi rõ họ tên và đóng dấu)</div>
            <br/><br/><br/>
            <div><strong>${cRep}</strong></div>
          </td>
          <td>
            <div class="sign-title">ĐẠI DIỆN BÊN A</div>
            <div class="sign-subtitle">(Ký số / Đóng dấu pháp nhân)</div>
            <br/><br/><br/>
            <div><strong>Lê Đình Anh</strong></div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        Hợp đồng được ký kết với tinh thần hợp tác, minh bạch và cùng phát triển.
      </div>
    </body>
    </html>
  `;

  const file = { content: templateHtml };
  const options = {
    format: "A4",
    printBackground: true,
    margin: { top: "0px", bottom: "0px", left: "0px", right: "0px" },
  };

  try {
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error("Lỗi khi tạo PDF Hợp đồng:", error);
    throw new Error("Không thể tạo file PDF Hợp đồng.");
  }
};

export const generatePDFFromHTML = async (html) => {
  const file = { content: html };
  const options = {
    format: "A4",
    printBackground: true,
    margin: { top: "10mm", bottom: "10mm", left: "15mm", right: "15mm" },
  };
  try {
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error("Lỗi khi tạo PDF:", error);
    throw new Error("Không thể tạo file PDF.");
  }
};
