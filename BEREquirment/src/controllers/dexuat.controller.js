'use strict';
const deXuatService = require('../services/dexuat.service');

const createProposal = async (req, res) => {
    try {
        const result = await deXuatService.guiDeXuat(req.params.buoi_id, req.body, req.user.giangvien_id);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
            details: error.details || null
        });
    }
};

const getPendingProposals = async (req, res) => {
    try {
        const data = await deXuatService.getDachSachDeXuat('pending', req.user || {});
        res.status(200).json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const handleReview = async (req, res) => {
    try {
        const { status, phan_hoi } = req.body;
        const reviewerId = req.user?.id || req.user?.taikhoan_id;
        await deXuatService.xuLyPheDuyet(req.params.dexuat_id, status, reviewerId, phan_hoi, req.user || {});
        res.status(200).json({ success: true, message: "Đã xử lý đề xuất." });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getMyProposals = async (req, res) => {
    try {
        // Lấy giangvien_id từ token (đã qua middleware authenticateToken)
        const data = await deXuatService.getDanhSachDeXuatCuaGiangVien(req.user.giangvien_id);
        res.status(200).json({ success: true, data });
    } catch (error) { 
        res.status(500).json({ success: false, message: error.message }); 
    }
};

module.exports = { createProposal, getPendingProposals, handleReview, getMyProposals };