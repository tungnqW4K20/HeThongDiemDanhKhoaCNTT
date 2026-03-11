'use strict';
const express = require('express');
const router = express.Router();
const deXuatController = require('../controllers/deXuat.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');



// API dành cho Giảng viên
router.post(
    '/gui-de-xuat/:buoi_id', 
    authenticateToken, 
    authorizeRole(['giangvien']), 
    deXuatController.createProposal
);

// API dành cho Admin
router.get(
    '/danh-sach-cho', 
    authenticateToken, 
    authorizeRole(['admin']), 
    deXuatController.getPendingProposals
);

router.put(
    '/phe-duyet/:dexuat_id', 
    authenticateToken, 
    authorizeRole(['admin']), 
    deXuatController.handleReview
);

router.get(
    '/my-proposals', 
    authenticateToken, 
    authorizeRole(['giangvien']), 
    deXuatController.getMyProposals
);

module.exports = router;