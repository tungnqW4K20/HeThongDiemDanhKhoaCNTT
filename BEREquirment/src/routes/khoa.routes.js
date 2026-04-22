const express = require('express');
const router = express.Router();
const khoaController = require('../controllers/khoa.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');


router.get('/get-all-khoa',authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']),  khoaController.handleGetAllKhoa);

router.get('/get-detail-khoa', khoaController.handleGetKhoaById);

router.post('/create-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleCreateKhoa);

router.put('/update-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleUpdateKhoa);

router.delete('/delete-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleDeleteKhoa);

router.get('/get-all-bo-mon', authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), khoaController.handleGetAllBoMon);
router.get('/get-all-bo-mon-raw', authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), khoaController.handleGetAllBoMonRaw);
router.get('/get-all-chuyen-nganh', authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), khoaController.handleGetAllChuyenNganh);
router.get('/get-truong-bo-mon-options', authenticateToken, authorizeRole(['admin', 'lanhdao']), khoaController.handleGetTruongBoMonOptions);
router.post('/create-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleCreateBoMon);
router.put('/update-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleUpdateBoMon);
router.delete('/delete-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleDeleteBoMon);
router.post('/create-chuyen-nganh', authenticateToken, authorizeRole('admin'), khoaController.handleCreateChuyenNganh);
router.put('/update-chuyen-nganh', authenticateToken, authorizeRole('admin'), khoaController.handleUpdateChuyenNganh);
router.delete('/delete-chuyen-nganh', authenticateToken, authorizeRole('admin'), khoaController.handleDeleteChuyenNganh);

module.exports = router;