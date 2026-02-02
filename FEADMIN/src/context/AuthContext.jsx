import { createContext, useState, useEffect } from 'react';
import authService from '../service/authService'; // Import service vừa sửa

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hàm check login khi F5 trang
  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Hàm login gọi API thực
  const login = async (username, password) => {
    try {
      const response = await authService.loginAdmin(username, password);
      
      // Dựa trên response mẫu bạn gửi: { success: true, data: { token: "...", user: {...} } }
      // Do interceptor axiosClient trả về response.data, nên ở đây ta nhận trực tiếp object đó
      if (response && response.success) {
        const { token, refreshToken, user } = response.data;

        // 1. Lưu vào LocalStorage
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // 2. Cập nhật State
        setUser(user);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, message: response.message || 'Đăng nhập thất bại' };
      }

    } catch (error) {
      console.error("Login error:", error);
      // Xử lý lỗi từ backend trả về (nếu có)
      const message = error.response?.data?.message || 'Lỗi kết nối server hoặc sai thông tin!';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};