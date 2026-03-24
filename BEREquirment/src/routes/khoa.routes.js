const express = require('express');
const router = express.Router();
const khoaController = require('../controllers/khoa.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');


router.get('/get-all-khoa',authenticateToken, authorizeRole(['admin', 'lanhdao']),  khoaController.handleGetAllKhoa);

router.get('/get-detail-khoa', khoaController.handleGetKhoaById);

router.post('/create-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleCreateKhoa);

router.put('/update-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleUpdateKhoa);

router.delete('/delete-khoa',authenticateToken, authorizeRole('admin'), khoaController.handleDeleteKhoa);

module.exports = router;