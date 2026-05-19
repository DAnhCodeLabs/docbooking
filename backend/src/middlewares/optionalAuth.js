// middleware/optionalAuth.js
import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Middleware xác thực tuỳ chọn:
 * - Nếu có token hợp lệ -> gắn req.user
 * - Nếu không token hoặc token lỗi -> req.user = null, không throw lỗi
 */
export const optionalAuth = async (req, res, next) => {
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    // Chỉ lấy id, không cần kiểm tra user tồn tại ở đây (để tối ưu)
    req.user = { _id: decoded.id };
  } catch (error) {
    // Token hết hạn hoặc sai – vẫn coi như chưa đăng nhập
    req.user = null;
  }
  next();
};
