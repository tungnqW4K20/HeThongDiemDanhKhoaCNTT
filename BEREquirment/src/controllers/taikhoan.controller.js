'use strict';
const taikhoanService = require('../services/taikhoan.service');

const getAllTaiKhoan = async (req, res) => {
    try {
        const result = await taikhoanService.getAllTaiKhoan();
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            errCode: -1,
            message: 'Internal Server Error'
        });
    }
};

const createTaiKhoan = async (req, res) => {
    try {
        const result = await taikhoanService.createTaiKhoan(req.body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            errCode: -1,
            message: 'Internal Server Error'
        });
    }
};

const updateTaiKhoan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await taikhoanService.updateTaiKhoan(id, req.body);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            errCode: -1,
            message: 'Internal Server Error'
        });
    }
};

const deleteTaiKhoan = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await taikhoanService.deleteTaiKhoan(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            errCode: -1,
            message: 'Internal Server Error'
        });
    }
};

const importTaiKhoanExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng đính kèm file Excel' });
        }
        
        const result = await taikhoanService.importTaiKhoanExcelService(req.file.buffer);
        
        if (result.errCode === 0) {
            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.data,
                successRows: result.successRows,
                failedRows: result.failedRows
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error("Lỗi Controller Import TaiKhoan:", error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi import: ' + error.message
        });
    }
};

module.exports = {
    getAllTaiKhoan,
    createTaiKhoan,
    updateTaiKhoan,
    deleteTaiKhoan,
    importTaiKhoanExcel
};
