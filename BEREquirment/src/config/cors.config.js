const cors = require('cors');

const corsOptions = {
   origin: ['http://localhost:5173','http://localhost:5174','http://localhost:8081'], 
  // origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Cho phép gửi cookie hoặc token
};



module.exports = cors(corsOptions);
