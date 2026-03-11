// const API_URL = "http://172.20.80.1:3000/api/diem-danh";

import { apiClient } from "./apiClient";

// interface AttendanceItem {
//   sinhvien_id: string;
//   trangthai: string; 
//   ghichu: string;
// }

// interface AttendancePayload {
//   lophocphan_id: string;
//   ngay: string; 
//   nguoi_tao: string; 
//   danh_sach: AttendanceItem[];
// }



// export const submitAttendance = async (payload: AttendancePayload) => {
//   try {
//     console.log("Đang gửi điểm danh...", JSON.stringify(payload, null, 2));

//     const response = await fetch(API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     const json = await response.json();

//     if (response.ok) {
//       return { success: true, data: json };
//     } else {
//       return { success: false, message: json.message || "Lỗi không xác định" };
//     }
//   } catch (error) {
//     console.error("Lỗi mạng hoặc server:", error);
//     return { success: false, message: "Không thể kết nối đến server" };
//   }
// };

export const submitAttendance = (payload: any) => 
  apiClient('/diem-danh', { method: 'POST', body: payload });