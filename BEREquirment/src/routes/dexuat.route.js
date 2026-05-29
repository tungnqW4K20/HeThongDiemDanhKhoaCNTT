'use strict';
const express = require('express');
const router = express.Router();
const deXuatController = require('../controllers/deXuat.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');



// API dành cho Giảng viên
router.post(
    '/gui-de-xuat/:buoi_id', 
    authenticateToken, 
    authorizeRole(['giangvien', 'truongbomon', 'lanhdao']), 
    deXuatController.createProposal
);

// API dành cho Admin, Trưởng bộ môn, Lãnh đạo
router.get(
    '/danh-sach-cho', 
    authenticateToken, 
    authorizeRole(['admin', 'truongbomon', 'lanhdao']), 
    deXuatController.getPendingProposals
);

router.put(
    '/phe-duyet/:dexuat_id', 
    authenticateToken, 
    authorizeRole(['admin', 'truongbomon', 'lanhdao']), 
    deXuatController.handleReview
);

router.get(
    '/my-proposals', 
    authenticateToken, 
    authorizeRole(['giangvien', 'truongbomon', 'lanhdao']), 
    deXuatController.getMyProposals
);

module.exports = router;