const cors = require('cors');

// Lấy danh sách origins cấu hình qua file .env (cách nhau bằng dấu phẩy)
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(item => item.trim()).filter(Boolean)
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // 1. Kiểm tra đối khớp trong danh sách .env
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 2. Tự động hỗ trợ các môi trường localhost và IP nội bộ
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    const isLocalIP = origin.match(/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/);
    
    if (isLocalhost || isLocalIP) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
};

module.exports = cors(corsOptions);
