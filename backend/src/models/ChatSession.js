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
  // [NEW]: Lưu trữ trạng thái nén (ví dụ: "Đã tư vấn BS Tuấn, khoa Thần kinh")
  metadata: {
    type: String,
    default: null,
  },
  timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  {
    timestamps: true,
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
