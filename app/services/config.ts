import Constants from 'expo-constants';

// Lấy cấu hình từ .env hoặc sử dụng giá trị mặc định
const API_URL = Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const API_TIMEOUT = Constants.expoConfig?.extra?.API_TIMEOUT || process.env.EXPO_PUBLIC_API_TIMEOUT || 15000;

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: Number(API_TIMEOUT),
};