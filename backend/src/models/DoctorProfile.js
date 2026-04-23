import mongoose from "mongoose";
import AiService from "../modules/Ai/ChatBot/AiService.js";

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
    // [BẢN VÁ P1]: Bỏ default: [] để tận dụng Sparse Indexing của MongoDB Atlas
    embedding: {
      type: [Number],
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

doctorProfileSchema.pre("save", async function (next) {
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

      // [BẢN VÁ P2]: Lấy thêm tên Bác sĩ để nhúng vào Vector, giúp AI tìm đúng tên
      let doctorName = "Chưa rõ";
      if (this.user) {
        const userDoc = await mongoose
          .model("User")
          .findById(this.user)
          .select("fullName");
        if (userDoc) doctorName = userDoc.fullName;
      }

      // Đã đưa ${doctorName} vào chuỗi Embedding
      const textToEmbed = `Bác sĩ ${doctorName}, chuyên khoa ${specName}. Kinh nghiệm thực tế ${this.experience} năm. Thông tin chuyên môn và điều trị: ${this.bio || "Không có"}`;

      const vectorData = await AiService.generateEmbedding(textToEmbed);

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
  next();
});

// Indexes
doctorProfileSchema.index({ status: 1 });

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
