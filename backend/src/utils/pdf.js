import html_to_pdf from "html-pdf-node";

/**
 * Tạo file PDF Hợp đồng từ dữ liệu phòng khám
 * @param {Object} clinicData - Dữ liệu phòng khám từ DB
 * @returns {Promise<Buffer>} - Trả về Buffer lưu trong RAM
 */
export const generateContractPDF = async (clinicData) => {
  // 1. Xử lý dữ liệu động & Thời gian
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();

  // Xử lý dữ liệu fallback (trường hợp data bị thiếu sẽ để đường chấm chấm cho phép điền tay)
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

  // Màu sắc chủ đạo của thương hiệu (Ví dụ: Xanh dương đậm sang trọng - Navy Blue)
  const primaryColor = "#0f2c59";

  // 2. Tạo template HTML cực kỳ chi tiết và chuyên nghiệp
  const templateHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        /* Thiết lập trang in cơ bản */
        @page {
          size: A4;
          margin: 0;
        }
        body {
          font-family: "Times New Roman", Times, serif; /* Font chuẩn văn bản pháp lý */
          font-size: 14pt;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          padding: 20mm 25mm 20mm 30mm; /* Lề chuẩn: Trên 2cm, Dưới 2cm, Trái 3cm, Phải 2.5cm */
          position: relative;
        }

        /* Watermark sang trọng ở giữa trang */
        .watermark {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100pt;
          color: rgba(15, 44, 89, 0.04);
          font-weight: bold;
          white-space: nowrap;
          z-index: -1;
          letter-spacing: 15px;
        }

        /* Phần Header: Quốc hiệu & Tiêu ngữ */
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .header-table td {
          vertical-align: top;
          text-align: center;
        }
        .company-info {
          width: 40%;
          font-weight: bold;
          font-size: 13pt;
        }
        .national-motto {
          width: 60%;
        }
        .motto-title {
          font-weight: bold;
          font-size: 14pt;
          margin: 0;
        }
        .motto-subtitle {
          font-weight: bold;
          font-size: 14pt;
          margin: 0;
          text-decoration: underline;
        }
        .line-company {
          width: 40%;
          height: 1px;
          background-color: #000;
          margin: 5px auto 0;
        }

        /* Tiêu đề Hợp đồng */
        .contract-title {
          text-align: center;
          color: ${primaryColor};
          font-size: 18pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 20px;
          margin-bottom: 5px;
        }
        .contract-no {
          text-align: center;
          font-style: italic;
          font-size: 13pt;
          margin-bottom: 20px;
        }

        /* Các phần căn cứ */
        .base-on {
          font-style: italic;
          font-size: 13pt;
          margin-bottom: 20px;
          text-align: justify;
        }

        /* Tiêu đề các Bên */
        .party-title {
          font-weight: bold;
          font-size: 14pt;
          color: ${primaryColor};
          margin-top: 25px;
          margin-bottom: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid ${primaryColor};
          padding-bottom: 5px;
          display: inline-block;
        }

        /* Bảng thông tin các bên */
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table td {
          padding: 3px 0;
          vertical-align: top;
        }
        .col-label {
          width: 150px;
          font-weight: normal;
        }

        /* Điều khoản */
        .article {
          margin-top: 20px;
          text-align: justify;
        }
        .article-title {
          font-weight: bold;
          margin-bottom: 5px;
        }

        /* Phần Ký tên */
        .signature-section {
          width: 100%;
          margin-top: 40px;
          page-break-inside: avoid; /* Tránh việc chữ ký bị cắt sang trang mới */
        }
        .signature-section td {
          width: 50%;
          text-align: center;
          vertical-align: top;
        }
        .sign-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .sign-subtitle {
          font-style: italic;
          font-size: 12pt;
          margin-bottom: 90px; /* Khoảng trống để ký tên và đóng dấu */
        }
      </style>
    </head>
    <body>
      <!-- Hình nền Watermark -->
      <div class="watermark">DOCGO SYSTEM</div>

      <!-- Header Quốc hiệu -->
      <table class="header-table">
        <tr>
          <td class="company-info">
            CÔNG TY CỔ PHẦN DOCGO
            <div class="line-company"></div>
          </td>
          <td class="national-motto">
            <p class="motto-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p class="motto-subtitle">Độc lập - Tự do - Hạnh phúc</p>
          </td>
        </tr>
      </table>

      <!-- Ngày tháng -->
      <div style="text-align: right; font-style: italic; margin-bottom: 30px; padding-right: 20px;">
        Hà Nội, ngày ${day} tháng ${month} năm ${year}
      </div>

      <!-- Tên Hợp đồng -->
      <div class="contract-title">HỢP ĐỒNG HỢP TÁC CUNG CẤP DỊCH VỤ</div>
      <div class="contract-no">Số: ${Date.now().toString().slice(-6)}/HĐHT/DOCGO-${year}</div>

      <!-- Căn cứ -->
      <div class="base-on">
        - Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội nước CHXHCN Việt Nam;<br/>
        - Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14/06/2005 của Quốc hội nước CHXHCN Việt Nam;<br/>
        - Căn cứ vào nhu cầu và khả năng đáp ứng của hai bên.
      </div>

      <div>Hôm nay, ngày ${day}/${month}/${year}, chúng tôi gồm có:</div>

      <!-- BÊN A -->
      <div class="party-title">BÊN A: CÔNG TY CỔ PHẦN CÔNG NGHỆ Y TẾ DOCGO</div>
      <table class="info-table">
        <tr>
          <td class="col-label">- Mã số thuế:</td>
          <td><strong>0123456789</strong></td>
        </tr>
        <tr>
          <td class="col-label">- Địa chỉ:</td>
          <td>182 đường Lê Duẩn, phường Trường Vinh, Nghệ An, Việt Nam</td>
        </tr>
        <tr>
          <td class="col-label">- Đại diện bởi:</td>
          <td><strong>Ông Lê Đình Anh</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: Giám đốc</td>
        </tr>
        <tr>
          <td class="col-label">- Số điện thoại:</td>
          <td>1900 1234</td>
        </tr>
        <tr>
          <td class="col-label">- Email:</td>
          <td>partners@docgo.vn</td>
        </tr>
      </table>

      <!-- BÊN B -->
      <div class="party-title">BÊN B: CƠ SỞ Y TẾ / PHÒNG KHÁM</div>
      <table class="info-table">
        <tr>
          <td class="col-label">- Tên cơ sở:</td>
          <td><strong>${cName}</strong></td>
        </tr>
        <tr>
          <td class="col-label">- Địa chỉ:</td>
          <td>${cAddress}</td>
        </tr>
        <tr>
          <td class="col-label">- Người đại diện:</td>
          <td><strong>${cRep}</strong></td>
        </tr>
        <tr>
          <td class="col-label">- Số điện thoại:</td>
          <td>${cPhone}</td>
        </tr>
        <tr>
          <td class="col-label">- Email:</td>
          <td>${cEmail}</td>
        </tr>
      </table>

      <div style="margin-top: 20px;">
        <em>Sau khi bàn bạc và thống nhất, hai bên đồng ý ký kết Hợp đồng hợp tác cung cấp dịch vụ trên nền tảng y tế số DocGo với các điều khoản sau:</em>
      </div>

      <!-- Nội dung hợp đồng -->
      <div class="article">
        <div class="article-title">ĐIỀU 1: NỘI DUNG HỢP TÁC</div>
        Bên A đồng ý cung cấp giải pháp công nghệ (Hệ thống phần mềm DocGo) để Bên B đưa các dịch vụ y tế, lịch khám bệnh của mình lên nền tảng trực tuyến, giúp bệnh nhân có thể đặt lịch khám bệnh dễ dàng.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 2: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
        - Đảm bảo hệ thống phần mềm hoạt động ổn định, an toàn và bảo mật thông tin dữ liệu bệnh nhân.<br/>
        - Hỗ trợ kỹ thuật cho Bên B trong suốt quá trình sử dụng dịch vụ.<br/>
        - Gửi thông báo đặt lịch tự động đến hệ thống quản lý của Bên B ngay khi có phát sinh giao dịch.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
        - Cung cấp chính xác, đầy đủ thông tin về dịch vụ, bác sĩ, giá khám và thời gian làm việc.<br/>
        - Đảm bảo chất lượng dịch vụ y tế đối với bệnh nhân đặt lịch qua nền tảng DocGo đúng như cam kết.<br/>
        - Chịu trách nhiệm hoàn toàn về chuyên môn y tế trong quá trình thăm khám và điều trị.
      </div>

      <div class="article">
        <div class="article-title">ĐIỀU 4: ĐIỀU KHOẢN CHUNG</div>
        - Hợp đồng này có hiệu lực kể từ ngày ký và có giá trị trong vòng 01 (một) năm.<br/>
        - Mọi tranh chấp phát sinh sẽ được hai bên giải quyết thông qua thương lượng, hòa giải. Nếu không giải quyết được sẽ đưa ra Tòa án có thẩm quyền tại TP. Hà Nội.<br/>
        - Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.
      </div>

      <!-- Khu vực chữ ký -->
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
            <div><strong>NGUYỄN VĂN A</strong></div>
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  // 3. Cấu hình in PDF
  const file = { content: templateHtml };
  const options = {
    format: "A4",
    printBackground: true, // Bắt buộc bật để hiển thị màu viền, màu nền và watermark
    margin: {
      top: "0px", // Set margin = 0 ở thư viện vì đã padding ở trong body HTML
      bottom: "0px", // Việc này giúp kiểm soát khoảng cách chính xác hơn cho Footer/Watermark
      left: "0px",
      right: "0px",
    },
  };

  // 4. Xuất ra Buffer
  try {
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error("Lỗi khi tạo PDF Hợp đồng:", error);
    throw new Error("Không thể tạo file PDF Hợp đồng.");
  }
};
