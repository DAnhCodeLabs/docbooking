import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const uploadToCloudinary = async (file, folder, retries = 2) => {
  const options = {
    folder,
    resource_type: "auto",
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    timeout: 120000, // 120 giây
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, options);
      return result.secure_url;
    } catch (error) {
      console.error(`[Cloudinary] Upload attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        // Lấy message rõ ràng từ error (ưu tiên error.error.message)
        let errorMessage = error.message;
        if (error.error && error.error.message)
          errorMessage = error.error.message;
        if (!errorMessage) errorMessage = String(error);
        throw new Error(`Cloudinary upload failed: ${errorMessage}`);
      }
      // Exponential backoff trước khi retry
      await sleep(1000 * attempt);
    }
  }
};
const extractPublicIdFromUrl = (url) => {
  const uploadIndex = url.indexOf("/image/upload/");
  if (uploadIndex === -1) {
    throw new Error(`URL không phải định dạng Cloudinary upload: ${url}`);
  }
  let publicId = url.substring(uploadIndex + "/image/upload/".length);
  const lastDot = publicId.lastIndexOf(".");
  if (lastDot !== -1) {
    publicId = publicId.substring(0, lastDot);
  }
  const versionMatch = publicId.match(/^v\d+\//);
  if (versionMatch) {
    publicId = publicId.substring(versionMatch[0].length);
  }
  return publicId;
};

export const deleteFromCloudinary = async (url) => {
  try {
    const publicId = extractPublicIdFromUrl(url);
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "not found") {
      console.warn(`[Cloudinary] File không tồn tại: ${publicId}`);
      return;
    }
    if (result.result !== "ok") {
      throw new Error(`Xóa ảnh thất bại: ${result.result}`);
    }
  } catch (error) {
    console.error("[Cloudinary] Delete error:", error);
    throw error;
  }
};
