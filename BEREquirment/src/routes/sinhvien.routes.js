'use strict';
const express = require('express');
const router = express.Router();
const svController = require('../controllers/sinhvien.controller');
const upload = require('../middlewares/upload.middleware'); 
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get('/lop/:lop_hanhchinh_id', svController.getSinhVienByLop);// lấy danh sách sinh viên của một lớp
router.get('/all', authenticateToken, authorizeRole('admin'), svController.getAllSinhVien);

router.post('/',authenticateToken, authorizeRole('admin'), svController.createSinhVien);

router.put('/:sinhvien_id',authenticateToken, authorizeRole('admin'), svController.updateSinhVien);

router.delete('/:sinhvien_id',authenticateToken, authorizeRole('admin'), svController.deleteSinhVien);
router.post('/import', upload.single('file'),authenticateToken, authorizeRole('admin'), svController.importStudents);

module.exports = router;
