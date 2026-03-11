'use strict';
const express = require('express');
const router = express.Router();
const phanCongAutoController = require('../controllers/phancong-auto.controller');

// Tạo lớp học phần và tự động sinh buổi học
router.post('/create', phanCongAutoController.taoLopHocPhanVaBuoiHoc);

// Lấy danh sách buổi học của lớp học phần
router.get('/:lophocphan_id/buoi-hoc', phanCongAutoController.layDanhSachBuoiHoc);

// Cập nhật một buổi học cụ thể
router.put('/buoi-hoc/:buoi_id', phanCongAutoController.capNhatBuoiHoc);

// Hủy buổi học (soft delete - đổi trạng thái)
router.delete('/buoi-hoc/:buoi_id', phanCongAutoController.huyBuoiHoc);

// Xóa hoàn toàn buổi học
router.delete('/buoi-hoc/:buoi_id/force', phanCongAutoController.xoaBuoiHoc);

// Cập nhật hàng loạt buổi học
router.put('/:lophocphan_id/buoi-hoc/bulk', phanCongAutoController.capNhatHangLoatBuoiHoc);

router.post('/create/lop-hoc-lai', phanCongAutoController.taoLopHocLai);

// router.post('/import', upload.single('file'), classController.importClasses);


module.exports = router;



