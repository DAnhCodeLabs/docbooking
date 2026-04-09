// src/modules/payment/payment.service.js
import { StatusCodes } from "http-status-codes";
import Appointment from "../../models/Appointment.js";
import Payment from "../../models/Payment.js";
import Slot from "../../models/Slot.js";
import User from "../../models/User.js";
import ApiError from "../../utils/ApiError.js";
import { sendAppointmentConfirmation } from "../../utils/email.js";
import logger from "../../utils/logger.js";
import { generateQRCode } from "../../utils/qr.js";
import {
  verifyChecksum,
  refundPayment as vnpayRefund,
} from "../../utils/vnpay.js";

/**
 * Atomic cập nhật slot (có hỗ trợ session)
 */
const atomicUpdateSlot = async (
  slotId,
  currentStatus,
  newStatus,
  additionalUpdate = {},
  session = null,
) => {
  const update = { $set: { status: newStatus, ...additionalUpdate } };
  const options = { returnDocument: "after" };
  if (session) options.session = session;
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, status: currentStatus },
    update,
    options,
  );
  return slot;
};

/**
 * Gửi email xác nhận sau khi thanh toán thành công
 */
const sendConfirmationEmail = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "fullName")
      .populate("patientProfile", "fullName");
    if (!appointment) {
      logger.error(`Không tìm thấy appointment ${appointmentId} để gửi email`);
      return;
    }
    const user = await User.findById(appointment.bookingUser).select("email");
    if (!user?.email) {
      logger.warn(`Không có email cho user ${appointment.bookingUser}`);
      return;
    }
    const slot = await Slot.findById(appointment.slot).populate("scheduleId");
    if (!slot || !slot.scheduleId) {
      logger.error(
        `Không tìm thấy slot hoặc schedule cho appointment ${appointmentId}`,
      );
      return;
    }
    const appointmentData = {
      patientName: appointment.patientProfile.fullName,
      doctorName: appointment.doctor.fullName,
      date: slot.scheduleId.date,
      time: `${slot.startTime} - ${slot.endTime}`,
      qrCodeUrl: appointment.qrCode,
    };
    await sendAppointmentConfirmation(user.email, appointmentData);
    logger.info(`Đã gửi email xác nhận cho appointment ${appointmentId}`);
  } catch (error) {
    logger.error(
      `Gửi email thất bại cho appointment ${appointmentId}: ${error.message}`,
    );
  }
};

/**
 * Xử lý thanh toán thành công (dùng chung cho IPN và confirm redirect)
 * @param {string} orderId - appointment._id
 * @param {object} query - Các tham số VNPAY trả về (vnp_TransactionNo, vnp_BankCode...)
 * @param {object} session - Mongoose session (tùy chọn, nếu có thì dùng, nếu không sẽ tạo mới)
 * @returns {Promise<object>}
 */
export const handlePaymentSuccess = async (orderId, query, session = null) => {
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy giao dịch");
  }
  if (payment.status === "paid") {
    return { message: "Giao dịch đã được xử lý trước đó" };
  }

  // 1. Cập nhật payment (chỉ nếu đang pending)
  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "pending" },
    {
      status: "paid",
      transactionNo: query.vnp_TransactionNo || null,
      bankCode: query.vnp_BankCode || null,
      responseCode: query.vnp_ResponseCode || null,
    },
    { returnDocument: "after" },
  );
  if (!updatedPayment) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Payment đã được cập nhật trước đó",
    );
  }

  // 2. Cập nhật appointment (chỉ nếu paymentStatus = pending)
  const appointment = await Appointment.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending" },
    {
      status: "confirmed",
      paymentStatus: "paid",
      transactionId: query.vnp_TransactionNo || null,
    },
    { returnDocument: "after" },
  );
  if (!appointment) {
    // Rollback payment về pending
    await Payment.findOneAndUpdate(
      { _id: payment._id, status: "paid" },
      {
        status: "pending",
        transactionNo: null,
        bankCode: null,
        responseCode: null,
      },
    );
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Appointment đã được cập nhật trước đó",
    );
  }

  // 3. Tạo QR code
  const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const qrData = `${baseUrl}/checkin/${appointment._id}`;
  const qrCode = await generateQRCode(qrData);
  appointment.qrCode = qrCode;
  await appointment.save();

  // 4. Cập nhật slot (pending_payment -> booked)
  const updatedSlot = await atomicUpdateSlot(
    appointment.slot,
    "pending_payment",
    "booked",
    { appointmentId: appointment._id },
    null, // không session
  );
  if (!updatedSlot) {
    // Rollback appointment và payment
    appointment.status = "pending_payment";
    appointment.paymentStatus = "pending";
    appointment.qrCode = null;
    await appointment.save();
    await Payment.findOneAndUpdate(
      { _id: payment._id, status: "paid" },
      {
        status: "pending",
        transactionNo: null,
        bankCode: null,
        responseCode: null,
      },
    );
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Slot đã bị thay đổi, không thể đặt lịch",
    );
  }

  // 5. Gửi email (ngoài transaction)
  await sendConfirmationEmail(orderId);
  return { message: "Cập nhật thành công" };
};
/**
 * Xử lý thanh toán thất bại (dùng chung cho IPN và confirm redirect)
 */
export const handlePaymentFailure = async (orderId, query) => {
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy giao dịch");
  }
  if (payment.status === "failed") {
    return { message: "Giao dịch đã được xử lý thất bại trước đó" };
  }

  // Cập nhật payment
  payment.status = "failed";
  payment.responseCode = query.vnp_ResponseCode || null;
  await payment.save();

  // Cập nhật appointment và giải phóng slot
  const appointment = await Appointment.findById(orderId);
  if (appointment && appointment.paymentStatus === "pending") {
    appointment.isDeleted = true;
    appointment.deletedAt = new Date();
    appointment.status = "cancelled";
    appointment.paymentStatus = "failed";
    await appointment.save();

    // Giải phóng slot
    await atomicUpdateSlot(appointment.slot, "pending_payment", "available", {
      appointmentId: null,
    });
  }

  logger.info(
    `Thanh toán thất bại cho appointment ${orderId}, code ${query.vnp_ResponseCode}`,
  );
  return { message: "Thanh toán thất bại" };
};

/**
 * Xử lý IPN từ VNPAY (giữ nguyên logic cũ, nhưng gọi các hàm đã tách)
 */
export const handleVnpayIpn = async (query) => {
  // 1. Verify checksum
  if (!verifyChecksum(query)) {
    logger.warn(`VNPAY IPN: checksum không hợp lệ ${JSON.stringify(query)}`);
    return { RspCode: "97", Message: "Invalid signature" };
  }

  const { vnp_TxnRef, vnp_ResponseCode } = query;

  // 2. Tìm payment
  const payment = await Payment.findOne({ orderId: vnp_TxnRef });
  if (!payment) {
    logger.warn(`VNPAY IPN: không tìm thấy payment cho orderId ${vnp_TxnRef}`);
    return { RspCode: "01", Message: "Order not found" };
  }

  // 3. Kiểm tra trạng thái hiện tại
  if (payment.status === "paid") {
    return { RspCode: "00", Message: "Success" };
  }

  try {
    if (vnp_ResponseCode === "00") {
      await handlePaymentSuccess(vnp_TxnRef, query);
      return { RspCode: "00", Message: "Success" };
    } else {
      await handlePaymentFailure(vnp_TxnRef, query);
      return { RspCode: "00", Message: "Success" }; // VNPAY yêu cầu trả 00 dù thất bại
    }
  } catch (error) {
    logger.error(`VNPAY IPN: lỗi xử lý ${error.message}`);
    return { RspCode: "99", Message: "Internal server error" };
  }
};

/**
 * Hàm dành cho redirect confirm từ frontend (không cần transaction phức tạp, dùng lại handlePaymentSuccess)
 */
export const confirmPaymentRedirect = async (query) => {
  if (!verifyChecksum(query)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chữ ký không hợp lệ");
  }
  const { vnp_TxnRef, vnp_ResponseCode } = query;
  if (vnp_ResponseCode === "00") {
    return await handlePaymentSuccess(vnp_TxnRef, query);
  } else {
    return await handlePaymentFailure(vnp_TxnRef, query);
  }
};

/**
 * Tính số tiền hoàn lại dựa trên thời gian hủy
 * @param {Date} slotStartTime - Thời gian bắt đầu slot (UTC)
 * @param {number} paidAmount - Số tiền đã thanh toán
 * @returns {number} - Số tiền được hoàn
 */
export const calculateRefundAmount = (slotStartTime, paidAmount) => {
  const now = new Date();
  const diffMs = slotStartTime - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 2) {
    return paidAmount; // 100%
  } else if (diffHours > 0 && diffHours < 2) {
    return Math.floor(paidAmount * 0.4); // 40%
  } else {
    return 0; // đã qua giờ khám – không hoàn
  }
};

/**
 * Thực hiện hoàn tiền (cập nhật DB + gọi VNPAY)
 * @param {string} paymentId
 * @param {number} refundAmount
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export const processRefund = async (paymentId, refundAmount, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment)
    throw new ApiError(StatusCodes.NOT_FOUND, "Không tìm thấy giao dịch");
  if (payment.status !== "paid")
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Giao dịch chưa được thanh toán",
    );
  if (payment.refundStatus === "completed")
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Giao dịch đã được hoàn tiền trước đó",
    );

  // Đánh dấu đang xử lý
  payment.refundStatus = "processing";
  await payment.save();

  try {
    // Gọi VNPAY refund
    const refundResult = await vnpayRefund({
      orderId: payment.orderId,
      amount: refundAmount,
      transactionNo: payment.transactionNo,
      refundReason: reason,
    });

    if (refundResult.responseCode === "00") {
      payment.refundStatus = "completed";
      payment.refundAmount = refundAmount;
      payment.refundedAt = new Date();
      payment.refundTransactionId = refundResult.refundTransactionId;
      await payment.save();

      return { success: true, refundAmount };
    } else {
      payment.refundStatus = "failed";
      await payment.save();
      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `Hoàn tiền thất bại: ${refundResult.message}`,
      );
    }
  } catch (error) {
    payment.refundStatus = "failed";
    await payment.save();
    throw error;
  }
};
