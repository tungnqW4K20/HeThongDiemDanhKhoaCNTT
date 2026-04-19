'use strict';
const express = require('express');
const router = express.Router();
const cosoController = require('../controllers/coso.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get('/all', authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), cosoController.handleGetAllCoSo);
router.post('/create', authenticateToken, authorizeRole('admin'), cosoController.handleCreateCoSo);
router.put('/update', authenticateToken, authorizeRole('admin'), cosoController.handleUpdateCoSo);
router.delete('/delete', authenticateToken, authorizeRole('admin'), cosoController.handleDeleteCoSo);

module.exports = router;
