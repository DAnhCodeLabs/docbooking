import QRCode from "qrcode";

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
