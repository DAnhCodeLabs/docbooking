import mongoose from "mongoose";

const clinicLeadSchema = new mongoose.Schema(
  {
    clinicName: {
      type: String,
      required: [true, "Tên phòng khám/cơ sở y tế là bắt buộc"],
      trim: true,
    },
    clinicType: {
      type: String,
      enum: ["hospital", "polyclinic", "specialist_clinic", "other"],
      required: [true, "Vui lòng chọn loại hình cơ sở y tế"],
    },
    address: {
      type: String,
      required: [true, "Địa chỉ là bắt buộc"],
      trim: true,
    },
    representativeName: {
      type: String,
      required: [true, "Tên người đại diện là bắt buộc"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    consultationFee: {
      type: Number,
      required: true,
      default: 50000,
    },
    // Mở rộng status: thêm locked, deleted
    status: {
      type: String,
      enum: [
        "pending",
        "contacted",
        "resolved",
        "rejected",
        "locked",
        "deleted",
      ],
      default: "pending",
    },
    // Các trường cho khóa
    lockedReason: {
      type: String,
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Các trường cho xóa mềm
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedReason: {
      type: String,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

clinicLeadSchema.index({ clinicName: "text", phone: "text", email: "text" });

export default mongoose.model("ClinicLead", clinicLeadSchema);
