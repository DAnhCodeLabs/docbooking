import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Cấu hình chuẩn cho Mongoose để tránh cảnh báo ở các phiên bản mới
    mongoose.set("strictQuery", true);

    // Kết nối đến MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(
      `[DATABASE]: 🟢 MongoDB đã kết nối thành công tại: ${conn.connection.host}`,
    );

    // Lắng nghe các sự kiện của Database trong quá trình server đang chạy
    mongoose.connection.on("error", (err) => {
      console.error(`[DATABASE]: 🔴 Lỗi kết nối MongoDB: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DATABASE]: 🟡 MongoDB đã mất kết nối!");
    });
  } catch (error) {
    console.error(`[DATABASE]: 🔴 Kết nối MongoDB thất bại: ${error.message}`);
    // Thoát process ngay lập tức nếu không kết nối được DB (vì DB là core)
    process.exit(1);
  }
};

// Xử lý ngắt kết nối an toàn khi tắt Server (Nhấn Ctrl+C)
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[DATABASE]: ⚪ Đã ngắt kết nối MongoDB an toàn do Server tắt.");
  process.exit(0);
});

export default connectDB;
