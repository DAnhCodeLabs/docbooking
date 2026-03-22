import axiosClient from "@/services/axiosClient";
import { showSuccess } from "@/utils/toast";

export const clinicLeadService = {
  /**
   * Đăng ký đối tác Cơ sở y tế (Hỗ trợ upload ảnh mặt tiền/logo)
   * @param {FormData} formData - Payload chứa thông tin và file ảnh
   */
  registerClinic: async (formData) => {
    // Gọi axiosClient với header multipart/form-data
    const response = await axiosClient.post(
      "/clinic-leads/register",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    // Hiển thị thông báo Toast nếu thành công
    if (response?.success && response?.message) {
      showSuccess(response.message);
    }

    return response?.data ?? response;
  },
};
