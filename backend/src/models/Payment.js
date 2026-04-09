import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true, // vnp_TxnRef
    },
    amount: {
      type: Number,
      required: true,
    },
    bankCode: {
      type: String,
      default: null,
    },
    transactionNo: {
      type: String,
      default: null, // vnp_TransactionNo
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    responseCode: {
      type: String,
      default: null, // vnp_ResponseCode
    },
    refundStatus: {
      type: String,
      enum: ["none", "processing", "completed", "failed"],
      default: "none",
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundTransactionId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ appointmentId: 1 });
paymentSchema.index({ status: 1 });

export default mongoose.model("Payment", paymentSchema);
