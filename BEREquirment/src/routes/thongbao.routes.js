'use strict';

const express = require('express');
const thongBaoController = require('../controllers/thongbao.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/canh-bao-sinh-vien',
  authenticateToken,
  authorizeRole('admin'),
  thongBaoController.handleCreateStudentWarning
);

router.get(
  '/my-notifications',
  authenticateToken,
  authorizeRole(['giangvien', 'truongbomon', 'lanhdao']),
  thongBaoController.handleGetMyNotifications
);

router.put(
  '/:id/read',
  authenticateToken,
  authorizeRole(['giangvien', 'truongbomon', 'lanhdao']),
  thongBaoController.handleMarkAsRead
);

router.get(
  '/missed-attendance-today',
  authenticateToken,
  authorizeRole(['giangvien', 'truongbomon', 'lanhdao']),
  thongBaoController.handleGetMissedAttendanceToday
);

module.exports = router;
