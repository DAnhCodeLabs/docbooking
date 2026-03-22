import multer from "multer";
import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

// Cấu hình storage (memory)
const storage = multer.memoryStorage();

// Bộ lọc file mặc định: cho phép ảnh và PDF
const defaultFileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        "Định dạng không hợp lệ. Chỉ cho phép ảnh hoặc PDF.",
      ),
    );
  }
};

// Hàm promise wrapper cho multer
const runMulter = (req, res, uploadInstance) => {
  return new Promise((resolve, reject) => {
    uploadInstance(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          reject(
            new ApiError(
              StatusCodes.PAYLOAD_TOO_LARGE,
              "Kích thước file vượt quá giới hạn cho phép.",
            ),
          );
        }
        reject(
          new ApiError(StatusCodes.BAD_REQUEST, `Lỗi tải file: ${err.message}`),
        );
      } else if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Middleware: parse một file (single)
 * @param {string} fieldName - Tên field trong form-data
 * @param {Object} options - Các tùy chọn: fileFilter, limits
 */
export const parseSingleFile = (fieldName, options = {}) => {
  const fileFilter = options.fileFilter || defaultFileFilter;
  const limits = options.limits || { fileSize: 10 * 1024 * 1024 }; // 10MB mặc định

  const upload = multer({ storage, fileFilter, limits }).single(fieldName);

  return async (req, res, next) => {
    try {
      await runMulter(req, res, upload);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: parse nhiều file (cùng tên field)
 * @param {string} fieldName - Tên field
 * @param {number} maxCount - Số lượng tối đa
 * @param {Object} options - Tùy chọn: fileFilter, limits
 */
export const parseMultipleFiles = (fieldName, maxCount, options = {}) => {
  const fileFilter = options.fileFilter || defaultFileFilter;
  const limits = options.limits || { fileSize: 10 * 1024 * 1024 };

  const upload = multer({ storage, fileFilter, limits }).array(
    fieldName,
    maxCount,
  );

  return async (req, res, next) => {
    try {
      await runMulter(req, res, upload);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: parse nhiều field khác nhau (dùng cho form phức tạp)
 * @param {Array} fields - Mảng { name, maxCount }
 * @param {Object} options - Tùy chọn: fileFilter, limits (áp dụng chung)
 */
export const parseFields = (fields, options = {}) => {
  const fileFilter = options.fileFilter || defaultFileFilter;
  const limits = options.limits || { fileSize: 10 * 1024 * 1024 };

  const upload = multer({ storage, fileFilter, limits }).fields(fields);

  return async (req, res, next) => {
    try {
      await runMulter(req, res, upload);
      next();
    } catch (error) {
      next(error);
    }
  };
};
