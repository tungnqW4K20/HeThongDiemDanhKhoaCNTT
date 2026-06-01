import { apiClient } from "./apiClient";

export const sinhvienService = {
  getLichHoc: () => apiClient('/sinhvien-self/lich-hoc'),
  getQuaTrinhDiemDanh: () => apiClient('/sinhvien-self/qua-trinh-diem-danh'),
};
