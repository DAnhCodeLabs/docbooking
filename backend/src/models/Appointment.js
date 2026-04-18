import mongoose from "mongoose";

/**
 * Appointment Model
 * NOTE: Uses HARD DELETE for cancelled appointments (not soft delete)
 * Reason: Previous soft-delete logic caused E11000 duplicate key errors on slot field
 *         when users re-booked slots after cancellation.
 *
 * Audit trail is preserved in AuditLog collection for cancelled appointments.
 * See: src/seeders/cleanupCancelledAppointments.js for cleanup of old cancelled records
 */

const appointmentSchema = new mongoose.Schema(
  {
    patientProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
      ],
      default: "confirmed",
    },
    qrCode: {
      type: String,
      required: true,
    },
    checkinTime: {
      type: Date,
    },
    note: {
      type: String,
      default: "",
    },
    symptoms: {
      type: String,
      default: "",
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
    },

    paymentMethod: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String,
      default: null,
    },
    paymentExpiryAt: {
      type: Date,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index để tìm kiếm nhanh
appointmentSchema.index({ bookingUser: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ paymentStatus: 1 });
appointmentSchema.index({ isDeleted: 1 });
appointmentSchema.index({ paymentExpiryAt: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
