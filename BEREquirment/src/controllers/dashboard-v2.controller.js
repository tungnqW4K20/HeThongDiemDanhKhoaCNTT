'use strict';
const dashboardService = require('../services/dashboard-v2.service');

const getSemesters = async (req, res) => {
    try {
        const result = await dashboardService.getSemesters();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getOverallAttendance = async (req, res) => {
    try {
        const { hocky_id } = req.query;
        const result = await dashboardService.getOverallAttendance(hocky_id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getClassDetailAttendance = async (req, res) => {
    try {
        const { lophocphan_id } = req.params;
        const result = await dashboardService.getClassDetailAttendance(lophocphan_id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSemesters, getOverallAttendance, getClassDetailAttendance };