import { useAuthStore } from "@/stores/authStore";
import { showError } from "@/utils/toast";
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "/api",
  // Giữ nguyên 30s cho các API thông thường (Login, Load dữ liệu...)
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // [BẢN VÁ LỖI AI TIMEOUT]: Tắt đếm ngược thời gian chờ đối với luồng Chat AI
    // Nếu URL là API chatbot, cho phép trình duyệt chờ vô cực (0)
    if (config.url && config.url.includes("/chatbot")) {
      config.timeout = 0;
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

    // Kiểm tra lỗi Timeout của chính Axios sinh ra
    if (error.code === "ECONNABORTED") {
      showError("Kết nối quá hạn. Vui lòng thử lại.");
      return Promise.reject({ success: false, message: "Request timeout" });
    }

    if (!error.response) {
      showError(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
      );
      return Promise.reject({ success: false, message: "Network error" });
    }

    const { status, data } = error.response;
    const isLoginRequest = originalRequest.url.includes("/auth/login");
    const isRefreshRequest = originalRequest.url.includes(
      "/auth/refresh-token",
    );

    if (
      status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          "/auth/refresh-token",
          {},
          { withCredentials: true },
        );

        const newAccessToken = response.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("Không nhận được access token từ server.");
        }

        useAuthStore.getState().updateAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        showError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return Promise.reject(refreshError);
      }
    }
    if (isLoginRequest && status === 401) {
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
      useAuthStore.getState().logout();
      showError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return Promise.reject({
        success: false,
        message: "Phiên đăng nhập đã hết hạn.",
        data: data,
        status: status,
      });
    }

    const buildErrorResponse = (status, data) => ({
      success: false,
      message: data?.message || "Có lỗi xảy ra. Vui lòng thử lại.",
      data: data,
      status: status,
    });

    if (status === 429) {
      const errorMessage =
        data?.message || "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
      showError(errorMessage);
      return Promise.reject(buildErrorResponse(status, data));
    }

    const errorMessage = data?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
    showError(errorMessage);

    return Promise.reject({
      success: false,
      message: errorMessage,
      data: data,
      status: status,
    });
  },
);

export default axiosClient;
