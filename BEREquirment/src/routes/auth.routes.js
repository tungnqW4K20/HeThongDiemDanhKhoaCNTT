const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-admin', authController.loginAdmin);
router.post('/refresh', authController.refreshToken);
router.post('/create-admin', authController.createAdmin);
router.put('/change-password', authenticateToken, authController.changePassword);

// Admin tạo tài khoản cho giảng viên (yêu cầu xác thực admin)
router.post(
  '/admin/tao-tk-gv',
  authenticateToken,
  authorizeRole(['admin']),
  authController.adminTaoTaiKhoanGV
);

// Admin cập nhật tài khoản giảng viên
router.put(
  '/admin/tk-gv/:taikhoan_id',
  authenticateToken,
  authorizeRole(['admin']),
  authController.adminUpdateAccountGV
);

module.exports = router;
