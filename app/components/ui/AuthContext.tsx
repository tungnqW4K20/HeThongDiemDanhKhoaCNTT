import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from '../../services/authService';

type AuthContextType = {
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (newUser: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Khôi phục session khi mở app
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Lỗi khi restore auth:", err);
      } finally {
        setLoading(false);
      }
    };
    restoreAuth();
  }, []);

  // 🔥 Xử lý login
  const login = async (username: string, password: string) => {
    try {
      const result = await authService.login({ username, password });

      if (!result.success) {
        throw new Error(result.message || "Đăng nhập thất bại");
      }

      // Lưu state
      setToken(result.data.token);
      setUser(result.data.user);

      // Lưu storage
      await AsyncStorage.setItem('token', result.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(result.data.user));

    } catch (err: any) {
      throw new Error(err.message || "Lỗi khi đăng nhập");
    }
  };

  // 🔥 Đăng xuất
  const logout = async () => {
    setToken(null);
    setUser(null);

    await AsyncStorage.multiRemove(['token', 'user']);
  };

  // 🔥 Cập nhật user local
  const updateUser = (newUser: any) => {
    setUser(newUser);
    AsyncStorage.setItem('user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được dùng trong AuthProvider");
  return context;
};
