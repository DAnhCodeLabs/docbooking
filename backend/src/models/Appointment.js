import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
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
      unique: true, // một slot chỉ được đặt một lần
    },
    status: {
      type: String,
      enum: ["confirmed", "checked_in", "completed", "cancelled"],
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
  },
  {
    timestamps: true,
  },
);

// Index để tìm kiếm nhanh
appointmentSchema.index({ bookingUser: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ status: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
