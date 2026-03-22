import axiosClient from "@/services/axiosClient";
import { showSuccess } from "@/utils/toast";

export const doctorService = {
  /**
   * Đăng ký đối tác Bác sĩ (Hỗ trợ upload file)
   * @param {FormData} formData - Payload chứa text và file
   */
  registerDoctor: async (formData) => {
    // Gọi trực tiếp axiosClient để trình duyệt tự động xử lý header multipart/form-data
    const response = await axiosClient.post(
      "/doctors/register",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (response?.success && response?.message) {
      showSuccess(response.message);
    }

    return response?.data ?? response;
  },
  getActiveClinics: async () => {
    const response = await axiosClient.get("/clinic-leads/active");
    return response?.data ?? response;
  },
};
