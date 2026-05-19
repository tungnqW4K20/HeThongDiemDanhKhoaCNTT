// import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from "./apiClient";

// const BASE_URL = "http://localhost:3000/api"; 

// export const giangVienService = {
//   getProfile: async (giangvien_id: string) => {
//     try {
//       const token = await AsyncStorage.getItem('token');
      
//       const response = await fetch(`${BASE_URL}/giang-vien/profile/${giangvien_id}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(token ? { Authorization: `Bearer ${token}` } : {}),
//         },
//       });

//       const json = await response.json();
//       return json;
//     } catch (error) {
//       console.error("Lỗi getProfile:", error);
//       return { success: false, message: "Lỗi kết nối mạng" };
//     }
//   }
// };
export const giangVienService = {
  getProfile: (giangvien_id: string) => apiClient(`/giang-vien/profile`), 
  getAdvisoryClasses: () => apiClient(`/giang-vien/chu-nhiem/lop-hanh-chinh`),
  getAdvisoryClassAttendance: (lop_id: string, hocky_id?: string) => 
    apiClient(`/giang-vien/chu-nhiem/lop-hanh-chinh/${lop_id}/attendance${hocky_id ? `?hocky_id=${hocky_id}` : ''}`),
};