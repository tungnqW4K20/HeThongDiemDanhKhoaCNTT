'use strict';

const express = require('express');
const giangVienController = require('../controllers/giangvien.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();


// router.get('/:giangvien_id/phan-cong', giangVienController.getPhanCongTheoHocKy);
router.get('/',authenticateToken, giangVienController.getAllGiangVien);

// router.get('/:giangvien_id/lich-giang-day', giangVienController.getLichGiangDay);
router.get('/get-gv-by-khoa',authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), giangVienController.handleGetGiangVienByMaKhoa);


router.get('/profile',authenticateToken, authorizeRole('giangvien'), giangVienController.getProfile);
router.post('/import', upload.single('file'), giangVienController.importGiangVienExcel);
router.get('/:id', giangVienController.handleGetGiangVienById);

router.post('/',authenticateToken, authorizeRole('admin'), giangVienController.handleCreateGiangVien);

router.put('/:id', authenticateToken, authorizeRole('admin'),giangVienController.handleUpdateGiangVien);

router.delete('/:id',authenticateToken, authorizeRole('admin'), giangVienController.handleDeleteGiangVien);




module.exports = router;

