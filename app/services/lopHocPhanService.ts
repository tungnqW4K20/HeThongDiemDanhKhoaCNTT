import { apiClient } from "./apiClient";

export const lopHocPhanService = {
  getSinhVienByLopHocPhan: async (lophocphan_id: string, ngay: string) => {
    return apiClient(`/lop-hoc-phan/${lophocphan_id}/sinhvien`, { 
      params: { ngay } 
    });
  },
};
