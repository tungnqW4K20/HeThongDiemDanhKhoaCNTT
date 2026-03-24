'use strict';
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const dashboardv2Controller = require('../controllers/dashboard-v2.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

// API Tổng hợp — Admin và Lãnh đạo đều xem được thống kê
router.get('/overview', authenticateToken, 
    authorizeRole(['admin', 'lanhdao']), DashboardController.getOverviewData);

// API riêng cho biểu đồ (Lazy load)
router.get('/chart', authenticateToken, 
    authorizeRole(['admin', 'lanhdao']), DashboardController.getChartDataOnly);

// 1. Lấy danh sách học kỳ
router.get('/hoc-ky', authenticateToken, authorizeRole('admin'), dashboardv2Controller.getSemesters);

// 2. Lấy thống kê biểu đồ theo học kỳ
router.get('/ti-le-lop-hoc', authenticateToken, authorizeRole('admin'), dashboardv2Controller.getOverallAttendance);

// 3. Lấy chi tiết lớp
router.get('/chi-tiet-lop/:lophocphan_id', authenticateToken, authorizeRole('admin'), dashboardv2Controller.getClassDetailAttendance);

module.exports = router;