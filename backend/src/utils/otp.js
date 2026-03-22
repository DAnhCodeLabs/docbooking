import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Sinh OTP ngẫu nhiên 6 chữ số
 * @returns {string} OTP dạng số
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP bằng bcrypt
 * @param {string} otp
 * @returns {Promise<string>}
 */
export const hashOtp = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

/**
 * So sánh OTP với hash
 * @param {string} otp
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const verifyOtp = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};
