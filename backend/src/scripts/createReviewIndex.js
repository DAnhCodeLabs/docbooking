import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Review from "../models/Review.js";
import logger from "../utils/logger.js";

dotenv.config();

const createReviewIndex = async () => {
  try {
    await connectDB();

    // Lấy danh sách index hiện có
    const indexes = await Review.collection.indexes();
    const targetPattern = { doctorId: 1, createdAt: -1 };
    const targetName = "doctorId_createdAt_desc";

    // Tìm index có cùng key pattern (không quan tâm tên)
    const existingIndex = indexes.find((idx) => {
      if (idx.name === "_id_") return false;
      const keys = idx.key;
      return JSON.stringify(keys) === JSON.stringify(targetPattern);
    });

    if (existingIndex) {
      if (existingIndex.name === targetName) {
        logger.info(
          "ℹ️ Index 'doctorId_createdAt_desc' already exists, skipping.",
        );
        process.exit(0);
      } else {
        logger.warn(
          `⚠️ Found index with same pattern but different name: ${existingIndex.name}. Dropping it...`,
        );
        await Review.collection.dropIndex(existingIndex.name);
        logger.info(`✅ Dropped old index: ${existingIndex.name}`);
      }
    }

    // Tạo index mới
    await Review.collection.createIndex(targetPattern, {
      background: true,
      name: targetName,
    });
    logger.info(
      "✅ Index 'doctorId_createdAt_desc' created on Review collection",
    );
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Failed to create index: ${error.message}`);
    process.exit(1);
  }
};

createReviewIndex();
