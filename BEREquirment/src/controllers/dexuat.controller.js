'use strict';
const deXuatService = require('../services/dexuat.service');

const createProposal = async (req, res) => {
    try {
        const result = await deXuatService.guiDeXuat(req.params.buoi_id, req.body, req.user.giangvien_id);
        res.status(201).json({ success: true, data: result });
    } catch (error) { res.status(error.statusCode || 500).json({ success: false, message: error.message }); }
};

const getPendingProposals = async (req, res) => {
    try {
        const data = await deXuatService.getDachSachDeXuat('pending');
        res.status(200).json({ success: true, data });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const handleReview = async (req, res) => {
    try {
        const { status, phan_hoi } = req.body;
        await deXuatService.xuLyPheDuyet(req.params.dexuat_id, status, req.user.taikhoan_id, phan_hoi);
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