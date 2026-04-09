import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import * as paymentService from "./payment.service.js";
import { verifyChecksum } from "../../utils/vnpay.js";
import sendSuccess from "../../utils/response.js";
/**
 * IPN endpoint từ VNPAY (không cần auth)
 */
export const vnpayIpn = asyncHandler(async (req, res) => {
  const result = await paymentService.handleVnpayIpn(req.query);
  // VNPAY yêu cầu trả về dạng text/plain hoặc JSON đơn giản
  res.status(StatusCodes.OK).json(result);
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const query = req.query; // VNPAY redirect dùng GET
  // Kiểm tra checksum
  if (!verifyChecksum(query)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chữ ký không hợp lệ");
  }
  const { vnp_ResponseCode, vnp_TxnRef } = query;

  if (vnp_ResponseCode === "00") {
    // Gọi service xử lý giống IPN (có thể tái sử dụng)
    const result = await paymentService.handlePaymentSuccess(vnp_TxnRef, query);
    sendSuccess(res, StatusCodes.OK, "Thanh toán thành công", result);
  } else {
    // Thất bại
    await paymentService.handlePaymentFailure(vnp_TxnRef, query);
    sendSuccess(res, StatusCodes.BAD_REQUEST, "Thanh toán thất bại");
  }
});