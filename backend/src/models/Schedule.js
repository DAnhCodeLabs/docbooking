import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Ngày làm việc (Lưu chuẩn UTC 00:00:00 để tránh lệch múi giờ)
    date: {
      type: Date,
      required: true,
    },
    totalSlots: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Master Dev: Đảm bảo một bác sĩ không thể tạo 2 lịch trùng vào cùng 1 ngày
scheduleSchema.index({ doctor: 1, date: 1 }, { unique: true });

export default mongoose.model("Schedule", scheduleSchema);
