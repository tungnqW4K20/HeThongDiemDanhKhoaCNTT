import { apiClient } from "./apiClient";

export const thongBaoService = {
  getMyNotifications: () => apiClient("/thong-bao/my-notifications"),
  markAsRead: (id: string) => apiClient(`/thong-bao/${id}/read`, { method: "PUT" }),
  getMissedAttendanceToday: () => apiClient("/thong-bao/missed-attendance-today"),
};
