'use strict';
const hocKyService = require('../services/hocky.service');

const getAllHocKy = async (req, res) => {
    try {
        const data = await hocKyService.getAllHocKy();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createHocKy = async (req, res) => {
    try {
        const { ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1, namhoc_id } = req.body;

        // Validation chuyên gia: Kiểm tra đủ các mốc thời gian
        if (!ten_hocky || !ngay_batdau || !ngay_ketthuc || !ngay_monday_tuan_1 || !namhoc_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Vui lòng nhập đầy đủ: Tên học kỳ, Ngày bắt đầu, Ngày kết thúc và Ngày Thứ 2 của tuần 1 và chọn năm học" 
            });
        }

        const data = await hocKyService.createHocKy(req.body);
        return res.status(201).json({ 
            success: true, 
            message: "Khởi tạo học kỳ thành công.", 
            data 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateHocKy = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await hocKyService.updateHocKy(id, req.body);
        return res.status(200).json({ success: true, message: "Cập nhật thành công.", data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteHocKy = async (req, res) => {
    try {
        await hocKyService.deleteHocKy(req.params.id);
        return res.status(200).json({ success: true, message: "Đã xóa học kỳ thành công." });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllHocKy,
    createHocKy,
    updateHocKy,
    deleteHocKy
};