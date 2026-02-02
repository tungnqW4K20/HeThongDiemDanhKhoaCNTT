'use strict';
const namHocService = require('../services/namhoc.service');

const getAllNamHoc = async (req, res) => {
    try {
        const data = await namHocService.getAllNamHoc();
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getNamHocById = async (req, res) => {
    try {
        const data = await namHocService.getNamHocById(req.params.id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const createNamHoc = async (req, res) => {
    try {
        const data = await namHocService.createNamHoc(req.body);
        res.status(201).json({ success: true, message: "Tạo năm học thành công", data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateNamHoc = async (req, res) => {
    try {
        const data = await namHocService.updateNamHoc(req.params.id, req.body);
        res.status(200).json({ success: true, message: "Cập nhật thành công", data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteNamHoc = async (req, res) => {
    try {
        await namHocService.deleteNamHoc(req.params.id);
        res.status(200).json({ success: true, message: "Xóa năm học thành công" });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllNamHoc,
    getNamHocById,
    createNamHoc,
    updateNamHoc,
    deleteNamHoc
};