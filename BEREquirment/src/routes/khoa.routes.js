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
router.get('/get-truong-bo-mon-options', authenticateToken, authorizeRole(['admin', 'lanhdao']), khoaController.handleGetTruongBoMonOptions);
router.post('/create-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleCreateBoMon);
router.put('/update-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleUpdateBoMon);
router.delete('/delete-bo-mon', authenticateToken, authorizeRole('admin'), khoaController.handleDeleteBoMon);

module.exports = router;