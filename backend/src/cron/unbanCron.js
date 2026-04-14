import cron from "node-cron";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Tự động quét và mở khóa tài khoản khi hết hạn
 * Chạy mỗi phút 1 lần (chuẩn xác đến từng phút)
 */
export const startUnbanCronJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date(); 
 
      // 1. Tìm các user bị khóa có thời gian bannedUntil <= hiện tại
      // (Truy vấn siêu nhanh nhờ Compound Index đã tạo ở User model)
      const usersToUnban = await User.find({
        status: "banned",
        bannedUntil: { $lte: now },
      }).select("_id"); // Chỉ lấy ID để tối ưu RAM

      if (usersToUnban.length === 0) return;

      const userIds = usersToUnban.map((user) => user._id);

      // 2. Mở khóa hàng loạt (Bulk Update) thay vì lặp qua từng user gọi .save()
      await User.updateMany(
        { _id: { $in: userIds } },
        {
          $set: { status: "active" },
          $unset: { bannedReason: "", bannedUntil: "" }, // Xóa luôn 2 field này
        },
      );

      // 3. Ghi Audit Log hàng loạt để lưu vết hệ thống
      const auditLogs = userIds.map((id) => ({
        userId: id,
        action: "UNBAN_USER",
        status: "SUCCESS",
        ipAddress: "SYSTEM_CRON", // sửa cho rõ nguồn
        userAgent: "SYSTEM_CRON",
        details: {
          unbannedBy: "SYSTEM",
          reason: "Tự động mở khóa khi đến hạn",
        },
      }));
      await AuditLog.insertMany(auditLogs);

      logger.info(
        `[CRON] 🟢 Đã tự động mở khóa ${userIds.length} tài khoản hết hạn.`,
      );
    } catch (error) {
      logger.error(
        `[CRON] 🔴 Lỗi khi chạy tự động mở khóa tài khoản: ${error.message}`,
      );
    }
  });
};
