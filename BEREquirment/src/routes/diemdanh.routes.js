'use strict';
const express = require('express');
const router = express.Router();
const DiemDanhController = require('../controllers/diemdanh.controller');


router.get('/', DiemDanhController.layDanhSach);

router.post('/', DiemDanhController.luuKetQua);

router.get('/macdinh', DiemDanhController.layDanhSachMacDinh);

module.exports = router;

