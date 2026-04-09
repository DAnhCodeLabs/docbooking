import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

/**
 * Middleware xử lý lỗi tập trung
 * Phân loại lỗi và trả về response phù hợp (tiếng Việt)
 */
const errorHandler = (err, req, res, next) => {
  // Nếu err là undefined hoặc null, tạo lỗi mặc định
  if (!err) {
    err = new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi không xác định, vui lòng thử lại.",
      true,
    );
  }

  // 1. Ghi log lỗi
  console.error("🔥 LỖI:", err);

  // 2. Khởi tạo biến error sẽ dùng để response
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  error.isOperational = false; // mặc định là lỗi lập trình

  // 3. Xử lý các loại lỗi cụ thể

  // 3.1. Lỗi từ MongoDB - CastError (ID không hợp lệ)
  if (err.name === "CastError") {
    const message = `Không tìm thấy tài nguyên với ID: ${err.value}`;
    error = new ApiError(StatusCodes.BAD_REQUEST, message, true);
    error.isOperational = true;
  }

  // 3.2. Lỗi từ MongoDB - Duplicate key (trùng dữ liệu)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    const message = `Giá trị "${value}" cho trường "${field}" đã tồn tại.`;
    error = new ApiError(StatusCodes.CONFLICT, message, true);
  }

  // 3.3. Lỗi từ MongoDB - ValidationError (validation từ mongoose)
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    const message = `Dữ liệu đầu vào không hợp lệ: ${errors.join(". ")}`;
    error = new ApiError(StatusCodes.BAD_REQUEST, message, true);
    error.isOperational = true;
    error.errors = errors; // gắn chi tiết lỗi nếu muốn
  }

  // 3.4. Lỗi từ JWT - Token không hợp lệ
  if (err.name === "JsonWebTokenError") {
    const message = "Token không hợp lệ. Vui lòng đăng nhập lại.";
    error = new ApiError(StatusCodes.UNAUTHORIZED, message, true);
    error.isOperational = true;
  }

  // 3.5. Lỗi từ JWT - Token hết hạn
  if (err.name === "TokenExpiredError") {
    const message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    error = new ApiError(StatusCodes.UNAUTHORIZED, message, true);
    error.isOperational = true;
  }

  // 3.6. Lỗi từ Zod - Validation error
  if (err.name === "ZodError") {
    const message = "Dữ liệu không hợp lệ";
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    error = new ApiError(StatusCodes.BAD_REQUEST, message, true);
    error.isOperational = true;
    error.errors = errors; // gắn chi tiết lỗi vào response
  }

  // 3.7. Lỗi parse JSON (client gửi body sai cú pháp)
  if (err.type === "entity.parse.failed") {
    const message =
      "Định dạng JSON không hợp lệ. Vui lòng kiểm tra lại dữ liệu gửi lên.";
    error = new ApiError(StatusCodes.BAD_REQUEST, message, true);
    error.isOperational = true;
  }

  // 3.8. Các lỗi khác không xác định (lập trình)
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "Lỗi hệ thống nội bộ",
      false, // programming error
      err.stack,
    );
  }

  // 4. Chuẩn bị response object
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
  };

  // 4.1. Nếu có chi tiết lỗi (errors) thì thêm vào
  if (error.errors) {
    response.errors = error.errors;
  }

  // 4.2. Trong môi trường development, thêm stack trace
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  // 5. Gửi response
  res.status(error.statusCode).json(response);
};

export default errorHandler;
