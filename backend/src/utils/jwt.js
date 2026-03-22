import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import ApiError from "./ApiError.js";

/**
 * Tạo Access Token (thời gian sống ngắn)
 * @param {string} userId
 * @param {string} role
 * @returns {string}
 */
export const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
};

/**
 * Tạo Refresh Token (thời gian sống dài)
 * @returns {string}
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId }, 
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
  );
};

/**
 * Xác thực Access Token
 * @param {string} token
 * @returns {Object}
 * @throws {ApiError}
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Access token đã hết hạn.",
        true,
      );
    }
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Access token không hợp lệ.",
        true,
      );
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Xác thực thất bại.", true);
  }
};

/**
 * Xác thực Refresh Token
 * @param {string} token
 * @returns {Object}
 * @throws {ApiError}
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Refresh token đã hết hạn.",
        true,
      );
    }
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Refresh token không hợp lệ.",
        true,
      );
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Xác thực thất bại.", true);
  }
};

export const refreshAccessToken = (userId, role) => {
  return generateAccessToken(userId, role);
};
