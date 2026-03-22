import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Helper validate email
const validateEmail = (email) => {
  return /^\S+@\S+\.\S+$/.test(email);
};

// Schema địa chỉ nhúng
const addressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  { _id: false },
);

// Schema liên hệ khẩn cấp
const emergencyContactSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    relationship: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    // ========== XÁC THỰC & BẢO MẬT ==========
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true, // tự động tạo index unique, không cần thêm index riêng
      lowercase: true,
      trim: true,
      validate: [validateEmail, "Email không hợp lệ"],
    },
    password: {
      type: String,
      required: [
        function () {
          // Master Dev: Khách vãng lai nộp hồ sơ bác sĩ chưa được cấp mật khẩu
          if (this.role === "doctor" && this.status === "inactive") {
            return false;
          }
          return true;
        },
        "Mật khẩu là bắt buộc",
      ],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    requiresPasswordChange: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
    },

    // ========== THÔNG TIN CÁ NHÂN CHUNG ==========
    fullName: {
      type: String,
      required: [true, "Họ Tên là bắt buộc"],
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
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    address: addressSchema,
    emergencyContact: emergencyContactSchema,

    // ========== VAI TRÒ ==========
    role: {
      type: String,
      enum: ["patient", "doctor", "admin", "clinic_admin"],
      default: "patient",
    },

    // ========== TRẠNG THÁI TÀI KHOẢN ==========
    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    bannedReason: String,
    bannedUntil: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual populate
userSchema.virtual("patientProfile", {
  ref: "PatientProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

userSchema.virtual("doctorProfile", {
  ref: "DoctorProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

// Middleware: mã hóa password trước khi lưu
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
});

// Phương thức: so sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Phương thức: kiểm tra mật khẩu đã thay đổi sau thời điểm token?
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Phương thức: tăng số lần đăng nhập sai và khóa tài khoản
userSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return;
  }
  this.loginAttempts += 1;
  if (this.loginAttempts >= 10) {
    const lockTime = 2 * 60 * 60 * 1000; // 2 giờ
    this.lockUntil = Date.now() + lockTime;
  }
  return this.save();
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Indexes (chỉ giữ các index không trùng với unique)
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

userSchema.index({ status: 1, bannedUntil: 1 });

userSchema.index(
  {
    fullName: "text",
    email: "text",
    phone: "text",
  },
  {
    weights: { fullName: 5, email: 3, phone: 1 }, // Ưu tiên tìm thấy trong tên trước
    name: "UserTextIndex",
  },
);

const User = mongoose.model("User", userSchema);

export default User;
