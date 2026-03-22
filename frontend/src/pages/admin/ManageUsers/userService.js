import { httpDelete, httpGet, httpPatch } from "@/services/http";

export const userService = {
  // Lấy danh sách người dùng
  getUsers: (params) => httpGet("/admin/users", params),

  // Lấy chi tiết người dùng
  getUserById: (id) => httpGet(`/admin/users/${id}`, {}, false),

  // Khóa tài khoản
  banUser: (id, data) => httpPatch(`/admin/users/${id}/ban`, data),

  // Mở khóa tài khoản
  unbanUser: (id) => httpPatch(`/admin/users/${id}/unban`),

  // Xóa mềm
  softDeleteUser: (id) => httpDelete(`/admin/users/${id}`),

  // Xóa cứng
  hardDeleteUser: (id) => httpDelete(`/admin/users/${id}/hard`),
};
