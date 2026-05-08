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

module.exports = {
    getAllTaiKhoan,
    createTaiKhoan,
    updateTaiKhoan,
    deleteTaiKhoan
};
