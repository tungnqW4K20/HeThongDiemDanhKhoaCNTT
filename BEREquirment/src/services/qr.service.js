'use strict';
const qrcode = require('qrcode');

const generateQrCodeBuffer = async (text) => {
    try {
        const options = {
            errorCorrectionLevel: 'H', 
            type: 'image/png',
            quality: 0.92,
            margin: 1,
        };
        const qrBuffer = await qrcode.toBuffer(text, options);
        return qrBuffer;
    } catch (error) {
        console.error('Không thể tạo mã QR:', error);
        throw new Error('Lỗi khi tạo mã QR.');
    }
};

module.exports = {
    generateQrCodeBuffer,
};


