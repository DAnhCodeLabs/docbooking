import { showSuccess } from "@/utils/toast";
import axiosClient from "./axiosClient";

const handleResponse = (response, showToast = true) => {
  if (response?.success !== undefined) {
    if (response.success && showToast && response.message) {
      showSuccess(response.message);
    } else if (!response.success) {
    }
  }
  return response?.data ?? response;
};

export const httpGet = async (url, params = {}, showToast = false) => {
  const response = await axiosClient.get(url, { params });
  return handleResponse(response, showToast);
};

export const httpPost = async (url, data = {}, showToast = true) => {
  const response = await axiosClient.post(url, data);
  return handleResponse(response, showToast);
};

export const httpPut = async (url, data = {}, showToast = true) => {
  const response = await axiosClient.put(url, data);
  return handleResponse(response, showToast);
};

export const httpPatch = async (url, data = {}, showToast = true) => {
  const response = await axiosClient.patch(url, data); // ✅ ĐÚNG
  return handleResponse(response, showToast);
};

export const httpDelete = async (url, data = {}, showToast = true) => {
  const response = await axiosClient.delete(url, { data });
  return handleResponse(response, showToast);
};
