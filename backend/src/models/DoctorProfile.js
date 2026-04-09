import mongoose from "mongoose";

// Schema bằng cấp (giữ nguyên)
const qualificationSchema = new mongoose.Schema(
  {
    degree: String,
    institution: String,
    year: Number,
  },
  { _id: false },
);

// Schema cho giấy tờ hành nghề (chứng chỉ, bằng cấp dạng file)
const documentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    publicId: String,
  },
  { _id: false },
);

// Schema cho ảnh hoạt động (thêm mới)
const activityImageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
  },
  { _id: false },
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Specialty",
      required: true,
    },
    qualifications: [qualificationSchema],
    experience: Number,
    licenseNumber: String,
    consultationFee: Number,
    bio: String,
    avatar: {
      type: String,
      default: "",
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClinicLead",
      default: null,
    },
    customClinicName: {
      type: String,
      default: null,
    },
    documents: [documentSchema], // giấy tờ hành nghề
    activityImages: [activityImageSchema], // ẢNH HOẠT ĐỘNG (thêm mới)

    status: {
      type: String,
      enum: [
        "pending",
        "pending_admin_approval",
        "active",
        "rejected",
        "inactive",
      ],
      default: "pending",
    },
    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    sumRating: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
doctorProfileSchema.index({ status: 1 });

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
