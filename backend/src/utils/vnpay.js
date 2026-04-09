import axios from "axios";
import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

/**
 * Sắp xếp object theo thứ tự alphabet của key
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    // Mã hóa cả key và value, thay thế %20 thành dấu + theo chuẩn VNPAY
    const encodedKey = encodeURIComponent(key).replace(/%20/g, "+");
    const encodedValue = encodeURIComponent(String(obj[key])).replace(
      /%20/g,
      "+",
    );
    sorted[encodedKey] = encodedValue;
  });
  return sorted;
};

/**
 * Tạo URL thanh toán VNPAY
 * @param {string} orderId - Mã đơn hàng (appointment._id)
 * @param {number} amount - Số tiền (VNĐ)
 * @param {string} returnUrl - URL redirect sau thanh toán
 * @param {string} ipnUrl - URL IPN callback
 * @param {string} clientIp - IP client
 * @returns {string} URL thanh toán
 */
export const generatePaymentUrl = (
  orderId,
  amount,
  returnUrl,
  clientIp = "127.0.0.1",
) => {
  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET?.trim();
  const vnpUrl = process.env.VNP_URL;

  if (!tmnCode || !secretKey || !vnpUrl) {
    throw new Error("Thiếu cấu hình VNPAY trong biến môi trường");
  }

  const createDate = dayjs().utc().format("YYYYMMDDHHmmss");

  const vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: `ORDER_${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: Math.floor(Number(amount) * 100),
    vnp_ReturnUrl: String(returnUrl),
    vnp_IpAddr: String(clientIp),
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnpParams);

  // Tạo chuỗi ký tự để ký bằng cách nối thủ công (Đảm bảo không bị thư viện ngoài làm sai lệch)
  const signData = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join("&");

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Gán chữ ký vào và tạo URL cuối cùng
  sortedParams["vnp_SecureHash"] = signed;
  const finalQueryString = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join("&");

  return `${vnpUrl}?${finalQueryString}`;
};

export const verifyChecksum = (query) => {
  const secretKey = process.env.VNP_HASH_SECRET?.trim();
  const { vnp_SecureHash, vnp_IpnUrl, ...rest } = query;

  if (!vnp_SecureHash || !secretKey) {
    console.error("[VNPAY] Thiếu secret key hoặc secure hash");
    return false;
  }

  const sorted = sortObject(rest);
  const signData = Object.keys(sorted)
    .map((key) => `${key}=${sorted[key]}`)
    .join("&");

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  if (process.env.NODE_ENV === "development") {
    console.log("[VNPAY DEBUG] signData (without vnp_IpnUrl):", signData);
    console.log("[VNPAY DEBUG] signed:", signed);
    console.log("[VNPAY DEBUG] vnp_SecureHash:", vnp_SecureHash);
  }

  return signed === vnp_SecureHash;
};

/**
 * Tạo yêu cầu hoàn tiền tới VNPAY
 * @param {Object} params - { orderId, amount, transactionNo, refundReason }
 * @returns {Promise<Object>} - { responseCode, message, refundTransactionId }
 */
export const refundPayment = async (params) => {
  const { orderId, amount, transactionNo, refundReason } = params;

  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET?.trim();
  const refundUrl = process.env.VNP_REFUND_URL;

  const missing = [];
  if (!tmnCode) missing.push("VNP_TMN_CODE");
  if (!secretKey) missing.push("VNP_HASH_SECRET");
  if (!refundUrl) missing.push("VNP_REFUND_URL");
  if (missing.length) {
    throw new Error(
      `Thiếu cấu hình VNPAY refund: ${missing.join(", ")} chưa được cấu hình trong biến môi trường.`,
    );
  }

  const refundParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "refund",
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: orderId,
    vnp_Amount: Math.floor(Number(amount) * 100),
    vnp_TransactionNo: transactionNo,
    vnp_TransactionType: "02",
    vnp_RefundReason: refundReason || "Khách hàng hủy lịch",
    vnp_CreateDate: dayjs().utc().format("YYYYMMDDHHmmss"),
  };

  const sorted = sortObject(refundParams);
  const signData = Object.keys(sorted)
    .map((key) => `${key}=${sorted[key]}`)
    .join("&");
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  refundParams["vnp_SecureHash"] = signed;

  console.log("[VNPAY Refund] Request URL:", refundUrl);
  console.log("[VNPAY Refund] Request params:", refundParams);

  const isMock =
    process.env.MOCK_REFUND === "true" &&
    process.env.NODE_ENV === "development";

  if (isMock) {
    console.log("[VNPAY Refund] 🔧 MOCK REFUND - Bỏ qua gọi thực tế");
    return {
      responseCode: "00",
      message: "Mock refund success",
      refundTransactionId: "MOCK_" + Date.now(),
    };
  }
  try {
    const response = await axios.post(refundUrl, null, {
      params: refundParams,
      timeout: 30000,
    });
    console.log("[VNPAY Refund] Response status:", response.status);
    console.log("[VNPAY Refund] Response data:", response.data);

    if (response.data && response.data.ResponseCode === "00") {
      return {
        responseCode: "00",
        message: "Success",
        refundTransactionId: response.data.TransactionNo || null,
      };
    } else {
      throw new Error(
        `VNPAY refund failed: ${response.data?.Message || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error("[VNPAY Refund] Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error(`Yêu cầu hoàn tiền thất bại: ${error.message}`);
  }
};
