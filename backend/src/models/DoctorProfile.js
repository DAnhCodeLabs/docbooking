import mongoose from "mongoose";
import AiService from "../modules/Ai/ChatBot/AiService.js";
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
    embedding: { type: [Number], default: [] },
  },
  {
    timestamps: true,
  },
);

doctorProfileSchema.pre("save", async function (next) {
  // Chỉ gọi AI nếu có sự thay đổi về chuyên môn để tiết kiệm API
  if (
    this.isModified("bio") ||
    this.isModified("experience") ||
    this.isModified("specialty") ||
    this.isNew
  ) {
    try {
      // 1. Lấy tên chuyên khoa (tránh lỗi null nếu chuyên khoa chưa có)
      let specName = "Đa khoa";
      if (this.specialty) {
        const specialtyDoc = await mongoose
          .model("Specialty")
          .findById(this.specialty)
          .select("name");
        if (specialtyDoc) specName = specialtyDoc.name;
      }

      // 2. Gom chữ thành Context sắc nét
      const textToEmbed = `Bác sĩ chuyên khoa ${specName}. Kinh nghiệm thực tế ${this.experience} năm. Thông tin chuyên môn và điều trị: ${this.bio || "Không có"}`;

      // 3. Xin tọa độ từ AI
      const vectorData = await AiService.generateEmbedding(textToEmbed);
      if (vectorData.length > 0) {
        this.embedding = vectorData;
      }
    } catch (error) {
      console.error(
        `⚠️ Lỗi Mongoose Hook (Bác sĩ ID: ${this._id}):`,
        error.message,
      );
      // Vẫn gọi next() để DB lưu được text, đảm bảo luồng Admin không bị treo
    }
  }
  next();
});

// Indexes
doctorProfileSchema.index({ status: 1 });

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
