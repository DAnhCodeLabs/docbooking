import mongoose from "mongoose";

// Schema bảo hiểm
const insuranceSchema = new mongoose.Schema(
  {
    provider: String,
    policyNumber: String,
    expiryDate: Date,
  },
  { _id: false },
);

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // tự động tạo index unique, không cần thêm index riêng
    },
    // ========== THÔNG TIN BỆNH NHÂN ==========
    medicalHistory: String,
    allergies: [String],
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    insurance: insuranceSchema,
  },
  {
    timestamps: true,
  },
);

// Đã bỏ patientProfileSchema.index({ user: 1 }) vì unique: true đã tạo

const PatientProfile = mongoose.model("PatientProfile", patientProfileSchema);

export default PatientProfile;
