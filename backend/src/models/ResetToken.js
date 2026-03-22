import mongoose from "mongoose";

const resetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // tự động tạo index unique
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index: tự động xóa token hết hạn
resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Đã bỏ index({ token: 1 }) vì unique: true đã tạo

const ResetToken = mongoose.model("ResetToken", resetTokenSchema);

export default ResetToken;
