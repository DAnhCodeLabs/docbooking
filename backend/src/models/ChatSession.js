import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: [
    {
      text: { type: String, required: true },
    },
  ],
  timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema(
  {
    // Nếu User đã đăng nhập, liên kết với bảng User. Nếu chưa, dùng sessionId dạng chuỗi.
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Đánh index để truy vấn cực nhanh
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true, // Tự động có createdAt, updatedAt
  },
);


chatSessionSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { user: null },
  },
);

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export default ChatSession;
