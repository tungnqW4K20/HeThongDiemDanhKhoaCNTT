'use strict';
const express = require('express');
const router = express.Router();
const namHocController = require('../controllers/namhoc.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

// Public hoặc dành cho tất cả giảng viên/admin xem
router.get('/all', authenticateToken, namHocController.getAllNamHoc);
router.get('/:id', authenticateToken, namHocController.getNamHocById);

// Chỉ Admin mới có quyền thay đổi dữ liệu
router.post('/create', authenticateToken, authorizeRole(['admin']), namHocController.createNamHoc);
router.put('/update/:id', authenticateToken, authorizeRole(['admin']), namHocController.updateNamHoc);
router.delete('/delete/:id', authenticateToken, authorizeRole(['admin']), namHocController.deleteNamHoc);

module.exports = router;