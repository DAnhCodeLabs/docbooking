/**
 * Đồng bộ danh sách chuyên khoa từ DoctorProfile active vào ClinicLead.specialties
 * Chạy một lần khi triển khai hoặc chạy cron định kỳ (VD: mỗi ngày)
 */
import dns from "dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import ClinicLead from "../models/ClinicLead.js";
import DoctorProfile from "../models/DoctorProfile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const syncSpecialties = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Lấy tất cả doctor profiles active và có clinicId, specialty
    const doctors = await DoctorProfile.find({
      status: "active",
      clinicId: { $ne: null },
      specialty: { $ne: null },
    }).select("clinicId specialty");

    // Gom nhóm theo clinicId
    const clinicSpecialtyMap = new Map(); // clinicId -> Set of specialtyId strings
    for (const doc of doctors) {
      const clinicId = doc.clinicId.toString();
      const specialtyId = doc.specialty.toString();
      if (!clinicSpecialtyMap.has(clinicId)) {
        clinicSpecialtyMap.set(clinicId, new Set());
      }
      clinicSpecialtyMap.get(clinicId).add(specialtyId);
    }

    // Cập nhật từng clinic
    for (const [clinicId, specialtySet] of clinicSpecialtyMap.entries()) {
      const specialtiesArray = Array.from(specialtySet).map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      await ClinicLead.updateOne(
        { _id: clinicId },
        { $addToSet: { specialties: { $each: specialtiesArray } } },
      );
      console.log(
        `Updated clinic ${clinicId} with ${specialtiesArray.length} specialties`,
      );
    }

    console.log("Sync completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  }
};

syncSpecialties();
