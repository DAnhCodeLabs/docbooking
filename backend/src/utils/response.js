import { StatusCodes } from "http-status-codes";

/**
 * Gửi response thành công chuẩn hóa
 * @param {Object} res - Express response object
 * @param {number} statusCode - Mã HTTP (mặc định 200 OK)
 * @param {string} message - Thông báo
 * @param {Object|Array} data - Dữ liệu trả về
 */
const sendSuccess = (
  res,
  statusCode = StatusCodes.OK,
  message = "Success",
  data = {},
) => {
  res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
};

export default sendSuccess;
