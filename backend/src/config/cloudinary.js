import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const uploadToCloudinary = async (file, folder) => {
  try {
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: "auto",
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    });
    return result.secure_url;
  } catch (error) {
    throw new Error("Error uploading to Cloudinary");
  }
};

const deleteFromCloudinary = async (imageUrl) => {
  try {
    const publicIdMatch = imageUrl.match(/\/v\d+\/(.+?)\.\w+$/);
    if (!publicIdMatch || !publicIdMatch[1]) {
      throw new Error(`Không thể trích xuất public_id từ URL: ${imageUrl}`);
    }
    const publicId = publicIdMatch[1];
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Lỗi khi xóa ảnh từ Cloudinary:", error);
    throw error; // Ném lại lỗi để caller xử lý
  }
};

export {
  cloudinary,
  deleteFromCloudinary,
  multer,
  storage,
  uploadToCloudinary,
};
