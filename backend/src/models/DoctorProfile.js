import mongoose from "mongoose";
import { generateEmbedding } from "../modules/Ai/ChatBot/AiService.js";

const qualificationSchema = new mongoose.Schema(
  {
    degree: String,
    institution: String,
    year: Number,
  },
  { _id: false },
);

const documentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    publicId: String,
  },
  { _id: false },
);

const activityImageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
  },
  { _id: false },
);

// Sub-schema lưu trữ thông tin tạm thời của ứng viên trước khi được tạo tài khoản User chính thức
const applicantInfoSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Họ tên ứng viên là bắt buộc"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email ứng viên là bắt buộc"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true, // SỬA ĐỔI CHIẾN LƯỢC: Cho phép nhiều bản ghi có giá trị null/undefined mà không vi phạm Unique Index
    },
    applicantInfo: {
      type: applicantInfoSchema,
      default: null, // Thêm cấu trúc lưu trữ thông tin thô khi chưa duyệt
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
    documents: [documentSchema],
    activityImages: [activityImageSchema],

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
    embedding: {
      type: [Number],
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

// MIDDLEWARE: Cập nhật cơ chế sinh Vector Embedding hỗ trợ cả trạng thái chưa có User chính thức
doctorProfileSchema.pre("save", async function () {
  if (
    this.isModified("bio") ||
    this.isModified("experience") ||
    this.isModified("specialty") ||
    this.isNew
  ) {
    try {
      let specName = "Đa khoa";
      if (this.specialty) {
        const specialtyDoc = await mongoose
          .model("Specialty")
          .findById(this.specialty)
          .select("name");
        if (specialtyDoc) specName = specialtyDoc.name;
      }

      let doctorName = "Chưa rõ";
      // FALLBACK LOGIC: Nếu đã có user thì lấy từ User, nếu chưa có thì lấy từ applicantInfo thô
      if (this.user) {
        const userDoc = await mongoose
          .model("User")
          .findById(this.user)
          .select("fullName");
        if (userDoc) doctorName = userDoc.fullName;
      } else if (this.applicantInfo && this.applicantInfo.fullName) {
        doctorName = this.applicantInfo.fullName;
      }

      const textToEmbed = `Bác sĩ ${doctorName}, chuyên khoa ${specName}. Kinh nghiệm thực tế ${this.experience} năm. Thông tin chuyên môn và điều trị: ${this.bio || "Không có"}`;

      const vectorData = await generateEmbedding(textToEmbed);

      if (vectorData && vectorData.length === 768) {
        this.embedding = vectorData;
      } else {
        this.embedding = undefined;
      }
    } catch (error) {
      console.error(
        `⚠️ Lỗi Mongoose Hook AI (Bác sĩ ID: ${this._id}):`,
        error.message,
      );
      this.embedding = undefined;
    }
  }
});

doctorProfileSchema.index({ status: 1 });

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
