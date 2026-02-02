'use strict';
const qrService = require('../services/qr.service');



const getLopListQr = async (req, res, next) => {
    try {
        // const urlToEncode = `${req.protocol}://${req.get('host')}/api/lop`;
        const urlToEncode = `http://192.168.1.65:3000/api/lop`;
        const qrImageBuffer = await qrService.generateQrCodeBuffer(urlToEncode);
        console.log('qrImageBuffer', qrImageBuffer)
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(qrImageBuffer);
    } catch (error) {
        console.error("Get QR Code Error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi tạo mã QR.'
        });
    }
};



const getPhanCongQrForGiangVien = async (req, res, next) => {
    try {
        const { giangvien_id } = req.params; 
        const { hocky_id } = req.query;

        if (!hocky_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp hocky_id.'
            });
        }

        const urlToEncode = `${req.protocol}://${req.get('host')}/api/giang-vien/${giangvien_id}/phan-cong?hocky_id=${hocky_id}`;
        
        const qrImageBuffer = await qrService.generateQrCodeBuffer(urlToEncode);

        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(qrImageBuffer);
    } catch (error) {
        console.error("Get Phan Cong QR Code Error:", error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ nội bộ khi tạo mã QR.'
        });
    }
};



module.exports = {
    getLopListQr,
    getPhanCongQrForGiangVien
};


