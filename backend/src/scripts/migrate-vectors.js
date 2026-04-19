import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import DoctorProfile from "../models/DoctorProfile.js";
import Specialty from "../models/Specialty.js";
import AiService from "../modules/Ai/ChatBot/AiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const runMigration = async () => {
  try {
    console.log("🔄 Đang kết nối tới MongoDB Local...");
    const dbUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.DB_URI ||
      process.env.DATABASE_URL;

    if (!dbUri) {
      console.log("\n❌ LỖI: Không tìm thấy đường dẫn kết nối MongoDB.");
      process.exit(1);
    }

    await mongoose.connect(dbUri);
    console.log("✅ Kết nối Database thành công!\n");

    // =====================================================================
    // SỬA LỖI Ở ĐÂY: Dùng cú pháp Object truyền thẳng 'model: Specialty'
    // để bỏ qua lỗi MissingSchemaError của Mongoose
    // =====================================================================
    const doctors = await DoctorProfile.find({
      $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    }).populate({
      path: "specialty",
      select: "name",
      model: Specialty, // Ép Mongoose dùng trực tiếp model được import ở dòng 6
    });

    if (doctors.length === 0) {
      console.log(
        "🎉 Tuyệt vời! Toàn bộ bác sĩ đều đã có Vector. Không cần migrate.",
      );
      process.exit(0);
    }

    console.log(
      `⚠️ Tìm thấy ${doctors.length} bác sĩ cần mã hóa. Bắt đầu xử lý...\n`,
    );

    let success = 0;
    let failed = 0;

    for (const doc of doctors) {
      try {
        const specName = doc.specialty ? doc.specialty.name : "Đa khoa";
        const contextText = `Bác sĩ chuyên khoa ${specName}. Kinh nghiệm thực tế ${doc.experience} năm. Thông tin chuyên môn và điều trị: ${doc.bio || "Không có"}`;

        process.stdout.write(
          `⏳ Đang xử lý ID [${doc._id}] - BS ${specName}... `,
        );

        const vectorData = await AiService.generateEmbedding(contextText);

        if (vectorData && vectorData.length > 0) {
          await DoctorProfile.updateOne(
            { _id: doc._id },
            { $set: { embedding: vectorData } },
          );
          console.log(`✅ Xong`);
          success++;
        } else {
          console.log(`❌ Lỗi: API trả về Vector rỗng`);
          failed++;
        }

        await new Promise((res) => setTimeout(res, 1500));
      } catch (err) {
        console.log(`❌ Lỗi hệ thống: ${err.message}`);
        failed++;
      }
    }

    console.log("\n====================================");
    console.log(`📊 BÁO CÁO MIGRATION HOÀN TẤT:`);
    console.log(`- Thành công : ${success}`);
    console.log(`- Thất bại   : ${failed}`);
    console.log("====================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi kết nối khởi tạo:", error);
    process.exit(1);
  }
};

runMigration();
