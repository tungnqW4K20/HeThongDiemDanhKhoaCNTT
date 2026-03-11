const khoaService = require('../services/khoa.service');

const handleGetAllKhoa = async (req, res) => {
    try {
        let response = await khoaService.getAllKhoa();
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleGetKhoaById = async (req, res) => {
    try {
        let id = req.query.id; 
        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter id'
            });
        }
        let response = await khoaService.getKhoaById(id);
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleCreateKhoa = async (req, res) => {
    try {
        let response = await khoaService.createKhoa(req.body);
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleUpdateKhoa = async (req, res) => {
    try {
        let response = await khoaService.updateKhoa(req.body);
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleDeleteKhoa = async (req, res) => {
    try {
        if (!req.body.id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter id'
            });
        }
        let response = await khoaService.deleteKhoa(req.body.id);
        return res.status(200).json(response);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

module.exports = {
    handleGetAllKhoa,
    handleGetKhoaById,
    handleCreateKhoa,
    handleUpdateKhoa,
    handleDeleteKhoa
};

