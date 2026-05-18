import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import dns from "dns";
dotenv.config();
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
const createAdmin = async () => {
  try {
    // Kết nối database
    await connectDB();

    const adminData = {
      email: "admin@admin.com",
      password: "Anh123", // sẽ được hash tự động qua pre-save
      fullName: "Admin",
      role: "admin",
      status: "active",
      emailVerified: true,
    };

    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("❌ Admin already exists.");
      process.exit(0);
    }

    // Tạo admin
    const admin = await User.create(adminData);
    console.log("✅ Admin created successfully:", admin.email);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
