import multer from "multer";
import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";

const DEFAULT_LIMITS = { fileSize: 10 * 1024 * 1024 }; // 10MB

const defaultFileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new ApiError(StatusCodes.BAD_REQUEST, "Chỉ hỗ trợ ảnh hoặc PDF."));
  }
};

const createMulterInstance = (options = {}) => {
  const { limits = DEFAULT_LIMITS, fileFilter = defaultFileFilter } = options;
  return multer({
    storage: multer.memoryStorage(),
    limits,
    fileFilter,
  });
};

export const singleFile = (fieldName, options = {}) => {
  const upload = createMulterInstance(options).single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new ApiError(
                StatusCodes.PAYLOAD_TOO_LARGE,
                "File vượt quá kích thước cho phép.",
              ),
            );
          }
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, `Lỗi upload: ${err.message}`),
          );
        }
        return next(err);
      }
      next();
    });
  };
};

export const multipleFiles = (fieldName, maxCount, options = {}) => {
  const upload = createMulterInstance(options).array(fieldName, maxCount);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new ApiError(
                StatusCodes.PAYLOAD_TOO_LARGE,
                "File vượt quá kích thước cho phép.",
              ),
            );
          }
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, `Lỗi upload: ${err.message}`),
          );
        }
        return next(err);
      }
      next();
    });
  };
};

export const fields = (fieldsArray, options = {}) => {
  const upload = createMulterInstance(options).fields(fieldsArray);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return next(
              new ApiError(
                StatusCodes.PAYLOAD_TOO_LARGE,
                "File vượt quá kích thước cho phép.",
              ),
            );
          }
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, `Lỗi upload: ${err.message}`),
          );
        }
        return next(err);
      }
      next();
    });
  };
};

export const checkFileExists = (options = {}) => {
  const { fieldName, minCount = 1, fields = [] } = options;
  return (req, res, next) => {
    if (fieldName) {
      if (!req.file) {
        return next(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Vui lòng tải lên file cho trường "${fieldName}".`,
          ),
        );
      }
      return next();
    }
    if (minCount > 0) {
      if (!req.files || req.files.length < minCount) {
        return next(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Vui lòng tải lên ít nhất ${minCount} file.`,
          ),
        );
      }
      return next();
    }
    if (fields.length > 0) {
      const missing = fields.filter(
        (f) =>
          !req.files || !req.files[f.name] || req.files[f.name].length === 0,
      );
      if (missing.length > 0) {
        const missingNames = missing.map((f) => f.name).join(", ");
        return next(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Vui lòng tải lên file cho các trường: ${missingNames}.`,
          ),
        );
      }
      return next();
    }
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next(
        new ApiError(StatusCodes.BAD_REQUEST, "Vui lòng tải lên file."),
      );
    }
    next();
  };
};
