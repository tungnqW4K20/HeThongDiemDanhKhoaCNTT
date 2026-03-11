import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from './config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: any;
  params?: Record<string, string>;
};

export const apiClient = async (endpoint: string, options: RequestOptions = {}) => {
  const { method = 'GET', body, headers, params } = options;

  // 1. Xử lý Query Parameters
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  // 2. Lấy Token tự động
  const token = await AsyncStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...headers,
  };

  // 3. Thiết lập Timeout (Chống treo app khi mạng yếu)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Xử lý lỗi hệ thống phổ biến
    if (response.status === 401) {
       // Tùy chọn: Xử lý logout hoặc refresh token tại đây
       console.warn("Token expired or invalid");
    }

    const json = await response.json();
    
    // Giữ nguyên cấu trúc trả về cho các service cũ
    return json; 
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`API Error [${endpoint}]:`, error);
    return { success: false, message: "Lỗi kết nối máy chủ" };
  }
};