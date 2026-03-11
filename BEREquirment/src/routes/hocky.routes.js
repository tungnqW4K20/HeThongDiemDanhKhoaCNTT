'use strict';
const express = require('express');
const router = express.Router();
const hocKyController = require('../controllers/hocky.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get('/all', hocKyController.getAllHocKy);

router.post('/create', authenticateToken, authorizeRole(['admin']), hocKyController.createHocKy);
router.put('/update/:id', authenticateToken, authorizeRole(['admin']), hocKyController.updateHocKy);
router.delete('/delete/:id', authenticateToken, authorizeRole(['admin']), hocKyController.deleteHocKy);

module.exports = router;
