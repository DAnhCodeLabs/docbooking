import mongoose from "mongoose";
import logger from "../../utils/logger.js";

/**
 * Xóa index slot_1 cũ trên collection appointments
 * Chạy một lần khi khởi động server
 */
export const removeSlotIndex = async () => {
  try {
    const Appointment = mongoose.model("Appointment");
    const indexes = await Appointment.collection.indexes();
    const slotIndex = indexes.find((idx) => idx.name === "slot_1");
    if (slotIndex) {
      await Appointment.collection.dropIndex("slot_1");
      logger.info(
        "[Appointment Init] ✅ Đã xóa index slot_1 cũ trên appointments",
      );
    } else {
      logger.info(
        "[Appointment Init] ℹ️ Index slot_1 không tồn tại, không cần xóa",
      );
    }
  } catch (error) {
    // Nếu lỗi (ví dụ collection chưa tồn tại), chỉ log warning, không ảnh hưởng server
    logger.warn(
      `[Appointment Init] ⚠️ Không thể xóa index slot_1: ${error.message}`,
    );
  }
};
