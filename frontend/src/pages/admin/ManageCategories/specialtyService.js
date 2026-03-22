import axiosClient from "@/services/axiosClient";
import { httpGet, httpPatch } from "@/services/http";
import { showSuccess } from "@/utils/toast";

export const specialtyService = {
  // Gọi API lấy danh sách chuyên khoa (có hỗ trợ phân trang, tìm kiếm, lọc status)
  getSpecialties: (params) => httpGet("/specialties", params),
  // API Thêm mới chuyên khoa (Hỗ trợ upload ảnh bằng FormData)
  createSpecialty: async (formData) => {
    // Không dùng httpPost ở đây vì ta cần gửi FormData
    const response = await axiosClient.post("/specialties", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response?.success && response?.message) {
      showSuccess(response.message);
    }
    return response?.data ?? response;
  },
  // API Cập nhật (dùng form-data vì có thể sửa ảnh)
  updateSpecialty: async (id, formData) => {
    const response = await axiosClient.patch(`/specialties/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response?.success && response?.message) showSuccess(response.message);
    return response?.data ?? response;
  },

  // 2. THÊM API XÓA MỀM / KHÔI PHỤC (Dùng JSON bình thường)
  toggleSpecialtyStatus: async (id, action) => {
    // action là chuỗi: "deactivate" hoặc "reactivate"
    const response = await httpPatch(`/specialties/${id}/status`, { action });
    if (response?.success && response?.message) {
      showSuccess(response.message);
    }
    return response?.data ?? response;
  },
};
