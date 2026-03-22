import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date, // Ngày nghỉ (Chuẩn hóa UTC 00:00:00)
      required: true,
    },
    startTime: {
      type: String, // VD: "08:00" (Nếu nghỉ nguyên ngày sẽ là "00:00")
      required: true,
    },
    endTime: {
      type: String, // VD: "12:00" (Nếu nghỉ nguyên ngày sẽ là "23:59")
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Tối ưu tìm kiếm khi quét xung đột
leaveSchema.index({ doctor: 1, date: 1, status: 1 });

export default mongoose.model("Leave", leaveSchema);
