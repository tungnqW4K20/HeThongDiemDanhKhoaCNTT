// export const authService = {
//   login: async ({ username, password }: any) => {
//     const res = await fetch("http://172.20.80.1:3000/api/auth/login", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username, password })
//     });



//     return res.json();
//   },
// };
import { apiClient } from "./apiClient";
export const authService = {
  login: (payload: any) => apiClient('/auth/login', { method: 'POST', body: payload }),
};