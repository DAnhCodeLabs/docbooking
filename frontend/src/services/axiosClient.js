import { useAuthStore } from "@/stores/authStore";
import { showError } from "@/utils/toast";
import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cho phép gửi cookie
});

// Request interceptor: gắn access token
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      showError(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
      );
      return Promise.reject({
        success: false,
        message: "Network error",
        data: null,
      });
    }

    const { status, data } = error.response;
    const isLoginRequest = originalRequest.url.includes("/auth/login");
    const isRefreshRequest = originalRequest.url.includes(
      "/auth/refresh-token",
    );

    // Xử lý 401 - Unauthorized
    if (
      status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !originalRequest._retry
    ) {
      // ✅ Thêm check
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = response.data;
        useAuthStore.getState().updateAccessToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        showError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return Promise.reject(refreshError);
      }
    }

    if (isLoginRequest && status === 401) {
      // 401 từ login = credential sai, KHÔNG phải session expired
      // KHÔNG logout vì user chưa đăng nhập
      const errorMessage =
        data?.message || "Email hoặc mật khẩu không chính xác.";
      showError(errorMessage);
      return Promise.reject({
        success: false,
        message: errorMessage,
        data: data,
        status: status,
      });
    }

    if (isRefreshRequest && status === 401) {
      // 401 từ refresh token = session hết hạn, CẦN logout
      useAuthStore.getState().logout();
      showError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return Promise.reject({
        success: false,
        message: "Phiên đăng nhập đã hết hạn.",
        data: data,
        status: status,
      });
    }

    // Xử lý 429 - Too Many Requests
    const buildErrorResponse = (status, data) => ({
      success: false,
      message: data?.message || "Có lỗi xảy ra. Vui lòng thử lại.",
      data: data,
      status: status,
    });

    // Xử lý 429 - Too Many Requests
    if (status === 429) {
      const errorMessage =
        data?.message || "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
      showError(errorMessage);
      return Promise.reject(buildErrorResponse(status, data)); // ✅ Consistent
    }

    // Các lỗi khác (bao gồm 401 từ request login)
    const errorMessage = data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
    showError(errorMessage);

    return Promise.reject({
      success: false,
      message: errorMessage,
      data: data,
      status: status,
    }); //
  },
);

export default axiosClient;
