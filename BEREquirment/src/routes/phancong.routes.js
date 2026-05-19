'use strict';
const express = require('express');
const router = express.Router();
const phanCongController = require('../controllers/phancong.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Định nghĩa endpoint GET để lấy lịch giảng dạy
// URL: GET http://your-domain/api/phancong/lich-giang-day
router.get('/lich-giang-day',authenticateToken, 
    authorizeRole(['giangvien', 'truongbomon', 'lanhdao']), phanCongController.getLichGiangDay);//lấy lịch dạy một kỳ của giảng viên

router.get(
    '/lich-giang-day/homnay', 
    authenticateToken, 
    authorizeRole(['giangvien', 'truongbomon', 'lanhdao']), 
    phanCongController.getLichHomNay
);// lấy lịch dạy hôm nay ngày mai của giảng viên 

router.get('/all',authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), phanCongController.getAllAssignments);
router.get('/all/lich-day',authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), phanCongController.getLichChiTietHocKy);
router.post('/import',authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), upload.single('file'), phanCongController.importSchedule);


router.get(
    '/all/hom-nay/admin', 
    authenticateToken, 
    authorizeRole(['admin']), 
    phanCongController.getAllLichHomNayAdmin
);

module.exports = router;


