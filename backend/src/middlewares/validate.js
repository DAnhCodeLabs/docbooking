import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import ApiError from "../utils/ApiError.js";

/**
 * Format lỗi Zod thành mảng các object { field, message }
 * @param {z.ZodError} zodError
 * @returns {Array<{ field: string, message: string }>}
 */
const formatZodError = (zodError) => {
  return zodError.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
};

/**
 * Middleware kiểm tra dữ liệu đầu vào bằng Zod
 * @param {Object} schemas - Object chứa các schema Zod cho body, query, params
 * @param {Object} options - Tùy chọn (ví dụ: stripUnknown: true/false)
 * @returns {Function} Express middleware
 */
const validate = (schemas = {}, options = { stripUnknown: true }) => {
  return (req, res, next) => {
    const errors = [];

    // Hàm xử lý từng phần (body, query, params)
    const parsePart = (partName, schema) => {
      if (!schema) return;
      try {
        let parsed;
        if (options.stripUnknown) {
          // Giữ nguyên behavior cũ: loại bỏ field lạ, không báo lỗi
          parsed = schema.parse(req[partName]);
        } else {
          // Khi không strip, yêu cầu strict để báo lỗi nếu có field lạ
          parsed = schema.strict().parse(req[partName]);
        }
        req[partName] = parsed;
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...formatZodError(error));
        } else {
          next(error);
        }
      }
    };

    // Parse từng phần nếu có schema
    parsePart("body", schemas.body);
    parsePart("query", schemas.query);
    parsePart("params", schemas.params);

    // Nếu có lỗi, throw ApiError
    if (errors.length > 0) {
      // Lấy message tổng quát
      const message = "Dữ liệu đầu vào không hợp lệ.";
      // Tạo ApiError và gắn errors vào để error handler xử lý
      const apiError = new ApiError(StatusCodes.BAD_REQUEST, message, true);
      apiError.errors = errors; // Gán chi tiết lỗi
      return next(apiError);
    }

    next();
  };
};

export default validate;
