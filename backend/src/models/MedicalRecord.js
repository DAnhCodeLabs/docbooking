import mongoose from "mongoose";

const insuranceSchema = new mongoose.Schema(
  {
    provider: { type: String },
    policyNumber: { type: String },
    expiryDate: { type: Date },
  },
  { _id: false },
);

const medicalRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: [true, "Họ tên là bắt buộc"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      match: [/^(0|\+84)[3-9][0-9]{8}$/, "Số điện thoại không hợp lệ"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Ngày sinh là bắt buộc"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Giới tính là bắt buộc"],
    },
    cccd: {
      type: String,
      required: [true, "Căn cước công dân là bắt buộc"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    insurance: insuranceSchema,
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    allergies: [String],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index để tìm kiếm nhanh
medicalRecordSchema.index({ user: 1 });

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);
export default MedicalRecord;
