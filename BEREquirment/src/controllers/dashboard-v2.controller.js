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
        const { hocky_id, bomon_id } = req.query;
        const { role, khoa_id, chuyennganh_id } = req.user || {};
        const result = await dashboardService.getOverallAttendance(hocky_id, {
            role,
            khoa_id,
            chuyennganh_id
        }, bomon_id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getClassDetailAttendance = async (req, res) => {
    try {
        const { lophocphan_id } = req.params;
        const { role, khoa_id, chuyennganh_id } = req.user || {};
        const result = await dashboardService.getClassDetailAttendance(lophocphan_id, {
            role,
            khoa_id,
            chuyennganh_id
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getDailyAttendanceReport = async (req, res) => {
    try {
        const { hocky_id, ngay, bomon_id, from_ngay, to_ngay } = req.query;
        const { role, khoa_id, chuyennganh_id } = req.user || {};
        const result = await dashboardService.getDailyAttendanceReport({
            hocky_id,
            ngay,
            bomon_id,
            from_ngay,
            to_ngay
        }, {
            role,
            khoa_id,
            chuyennganh_id
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSemesters, getOverallAttendance, getClassDetailAttendance, getDailyAttendanceReport };