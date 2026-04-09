import mongoose from "mongoose";

const revenueSplitSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicLead",
      required: true,
    },
    platformAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    clinicAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    method: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled_refund"],
      default: "completed",
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Indexes
revenueSplitSchema.index({ clinicId: 1 });
revenueSplitSchema.index({ calculatedAt: -1 });
revenueSplitSchema.index({ method: 1 });

const RevenueSplit = mongoose.model("RevenueSplit", revenueSplitSchema);
export default RevenueSplit;
