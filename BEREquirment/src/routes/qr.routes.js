'use strict';

const express = require('express');
const qrController = require('../controllers/qr.controller');

const router = express.Router();

router.get('/danh-sach-lop', qrController.getLopListQr);
router.get('/phan-cong', qrController.getLopListQr);
router.get('/phan-cong/:giangvien_id', qrController.getPhanCongQrForGiangVien);

module.exports = router;



