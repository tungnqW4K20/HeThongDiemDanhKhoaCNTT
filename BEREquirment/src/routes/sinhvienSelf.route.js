'use strict';
const express = require('express');
const router = express.Router();
const svSelfController = require('../controllers/sinhvienSelf.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

// Các API dành riêng cho vai trò sinh viên tự tra cứu
router.get(
  '/lich-hoc',
  authenticateToken,
  authorizeRole(['sinhvien', 'admin']),
  svSelfController.getMySchedule
);

router.get(
  '/qua-trinh-diem-danh',
  authenticateToken,
  authorizeRole(['sinhvien', 'admin']),
  svSelfController.getMyAttendanceHistory
);

module.exports = router;
