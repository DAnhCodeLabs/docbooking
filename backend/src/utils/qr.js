import QRCode from "qrcode";

/**
 * Tạo QR code dưới dạng dataURL (base64)
 * @param {string} data - Dữ liệu cần mã hóa
 * @returns {Promise<string>} - URL dạng data:image/png;base64,...
 */
export const generateQRCode = async (data) => {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 300,
    });
    return qrDataURL;
  } catch (error) {
    throw new Error(`Không thể tạo QR code: ${error.message}`);
  }
};
