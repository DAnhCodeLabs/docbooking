import axiosClient from "@/services/axiosClient";
import { httpDelete, httpGet, httpPatch } from "@/services/http";

export const doctorApi = {
  // Bóc data lõi từ backend response
  getMyProfile: async () => {
    const res = await httpGet("/doctors/profile");
    return res;
  },

  updateProfile: async (data) => {
    const res = await httpPatch("/doctors/profile", data, true); // true = Bật Toast thông báo
    return res;
  },

  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append("document", file);
    // Bắt buộc dùng axiosClient trực tiếp để override header multipart
    const res = await axiosClient.post("/doctors/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res?.data?.document; // Lấy đúng object document vừa cấu hình ở backend
  },

  deleteDocument: async (publicId) => {
    if (!publicId)
      return Promise.reject(
        new Error("Dữ liệu file bị lỗi (Thiếu ID). Không thể xóa."),
      );
    const safeId = encodeURIComponent(publicId);
    const res = await httpDelete(`/doctors/documents/${safeId}`, {}, true); // ✅ OK sau khi sửa http.js
    return res;
  },

  uploadActivityImage: async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await axiosClient.post("/doctors/activity-images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res?.data?.image; // Lấy đúng object image vừa cấu hình ở backend
  },

  deleteActivityImage: async (publicId) => {
    if (!publicId)
      return Promise.reject(
        new Error("Dữ liệu file bị lỗi (Thiếu ID). Không thể xóa."),
      );

    const safeId = encodeURIComponent(publicId);
    const res = await httpDelete(
      `/doctors/activity-images/${safeId}`,
      {},
      true,
    );
    return res;
  },
};
