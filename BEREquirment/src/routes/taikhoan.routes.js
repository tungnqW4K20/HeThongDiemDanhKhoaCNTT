const express = require('express');
const taikhoanController = require('../controllers/taikhoan.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

const router = express.Router();

// Tất cả các route quản lý tài khoản đều yêu cầu quyền admin
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

router.get('/', taikhoanController.getAllTaiKhoan);
router.post('/', taikhoanController.createTaiKhoan);
router.put('/:id', taikhoanController.updateTaiKhoan);
router.delete('/:id', taikhoanController.deleteTaiKhoan);

module.exports = router;
