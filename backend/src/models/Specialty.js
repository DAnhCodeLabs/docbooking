import mongoose from "mongoose";

const specialtySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên chuyên khoa là bắt buộc"],
      unique: true, // Không được phép trùng tên
      trim: true,
    },
    description: {
      type: String,
      default: "", // Có thể để trống
    },
    image: {
      type: String,
      default: null, // Sẽ chứa URL ảnh từ Cloudinary
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active", // Mặc định tạo ra là hoạt động
    },
  },
  { timestamps: true },
);

// Đánh Index để tối ưu tốc độ tìm kiếm cho Bệnh nhân trên trang chủ
specialtySchema.index({ status: 1, name: 1 });
specialtySchema.index({ name: "text", description: "text" });

export default mongoose.model("Specialty", specialtySchema);
