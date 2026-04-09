import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    drugName: { type: String, required: true },
    dosage: { type: String, required: true },
    instructions: { type: String, required: true },
    duration: { type: String }, // optional, e.g., "5 ngày", "uống trong 7 ngày"
  },
  { _id: false },
);

const medicalConsultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true, // một lịch hẹn chỉ có một kết quả khám
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnosis: {
      type: String,
      required: [true, "Chẩn đoán không được để trống"],
      trim: true,
    },
    prescription: [prescriptionSchema], // mảng thuốc
    instructions: {
      type: String,
      default: "",
    },
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Index để tìm nhanh
medicalConsultationSchema.index({ doctorId: 1 });
medicalConsultationSchema.index({ patientId: 1 });

const MedicalConsultation = mongoose.model(
  "MedicalConsultation",
  medicalConsultationSchema,
);
export default MedicalConsultation;
