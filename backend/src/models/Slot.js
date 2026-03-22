import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    startTime: {
      type: String, // Định dạng "HH:mm" (VD: "08:00")
      required: true,
    },
    endTime: {
      type: String, // Định dạng "HH:mm" (VD: "08:30")
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "booked", "blocked"],
      default: "available",
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null, // Sẽ điền ID cuộc hẹn khi có người đặt
    },
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leave",
      default: null, // Sẽ có giá trị khi bị khóa do Bác sĩ báo nghỉ
    },
  },
  { timestamps: true },
);

slotSchema.index({ scheduleId: 1, startTime: 1 });
slotSchema.index({ status: 1 });

export default mongoose.model("Slot", slotSchema);
