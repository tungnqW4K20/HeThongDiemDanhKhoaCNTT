'use strict';

const express = require('express');
const lopController = require('../controllers/lop.controller');
const upload = require('../middlewares/upload.middleware'); 
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

const router = express.Router();
router.get('/', lopController.getAll);
router.get('/:lop_id/sinhvien', lopController.getStudentsByClass);
router.post('/',authenticateToken, authorizeRole('admin'), lopController.createLop);
router.put('/:lop_id', authenticateToken, authorizeRole('admin'), lopController.updateLop);
// router.post('/import', upload.single('file'),authenticateToken, authorizeRole('admin'), lopController.importClasses);
router.post('/import', 
    authenticateToken, 
    authorizeRole('admin'), 
    upload.single('file'), // Sau đó mới đến multer xử lý file
    lopController.importClasses
);

module.exports = router;