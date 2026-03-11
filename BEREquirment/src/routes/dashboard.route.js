'use strict';
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

// API Tổng hợp — Admin và Lãnh đạo đều xem được thống kê
router.get('/overview', authenticateToken, 
    authorizeRole(['admin', 'lanhdao']), DashboardController.getOverviewData);

// API riêng cho biểu đồ (Lazy load)
router.get('/chart', authenticateToken, 
    authorizeRole(['admin', 'lanhdao']), DashboardController.getChartDataOnly);

module.exports = router;