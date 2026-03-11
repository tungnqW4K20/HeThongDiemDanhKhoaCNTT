// import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiClient } from "./apiClient";

// const BASE_URL = "http://172.20.80.1:3000/api";

// export const hocKyService = {
//   getAllHocKy: async () => {
//     const token = await AsyncStorage.getItem("token");

//     const res = await fetch(`${BASE_URL}/hoc-ky/all`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         ...(token ? { Authorization: `Bearer ${token}` } : {})
//       }
//     });

//     return res.json();
//   }
// };
export const hocKyService = {
  getAllHocKy: () => apiClient('/hoc-ky/all'),
};