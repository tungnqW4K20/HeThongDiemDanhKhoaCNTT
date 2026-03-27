'use strict';
const express = require('express');
const router = express.Router();
const phanCongAutoController = require('../controllers/phancong-auto.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

const adminScopeRoles = ['admin', 'lanhdao', 'truongbomon'];

// Tạo lớp học phần và tự động sinh buổi học
router.post('/create', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.taoLopHocPhanVaBuoiHoc);

// Sửa thủ công một lịch dạy (cập nhật cả lớp học phần và tái tạo các buổi học)
router.put('/update/:buoi_id', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.capNhatLichDayThuCong);

// Lấy danh sách buổi học của lớp học phần
router.get('/:lophocphan_id/buoi-hoc', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.layDanhSachBuoiHoc);

// Cập nhật một buổi học cụ thể
router.put('/buoi-hoc/:buoi_id', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.capNhatBuoiHoc);

// Hủy buổi học (soft delete - đổi trạng thái)
router.delete('/buoi-hoc/:buoi_id', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.huyBuoiHoc);

// Xóa hoàn toàn buổi học
router.delete('/buoi-hoc/:buoi_id/force', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.xoaBuoiHoc);

// Cập nhật hàng loạt buổi học
router.put('/:lophocphan_id/buoi-hoc/bulk', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.capNhatHangLoatBuoiHoc);

router.post('/create/lop-hoc-lai', authenticateToken, authorizeRole(adminScopeRoles), phanCongAutoController.taoLopHocLai);

// router.post('/import', upload.single('file'), classController.importClasses);


module.exports = router;



