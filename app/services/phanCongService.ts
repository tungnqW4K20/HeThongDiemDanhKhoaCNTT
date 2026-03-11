import { apiClient } from "./apiClient";

export const phanCongService = {
  getLichGiangDay: async (hocky_id: string) => {
    return apiClient('/phan-cong/lich-giang-day', { params: { hocky_id } });
  },

  // getLichHomNay: async () => {
  //   const json = await apiClient('/phan-cong/lich-giang-day/homnay');
    
  //   if (!json.success || !Array.isArray(json.data)) return json;

  //   // Giữ nguyên logic Flatten dữ liệu của bạn để UI hiển thị mượt
  //   const allClasses: any[] = [];
  //   json.data.forEach((lhp: any) => {
  //     if (lhp.DanhSachBuoiHoc?.length > 0) {
  //       lhp.DanhSachBuoiHoc.forEach((buoi: any) => {
  //         allClasses.push({
  //           ...lhp,
  //           Lop: lhp.LopHanhChinh || { ten_lop: "Không xác định" },
  //           buoi_id: buoi.buoi_id,
  //           ngay: buoi.ngay,
  //           batdau: buoi.batdau,
  //           ketthuc: buoi.ketthuc,
  //           trangthai: buoi.trangthai,
  //         });
  //       });
  //     }
  //   });

  //   return { ...json, data: allClasses };
  // },
  getLichHomNay: async () => {
    // API trả về danh sách các buổi học của hôm nay và ngày mai
    return await apiClient('/phan-cong/lich-giang-day/homnay');
  },
};