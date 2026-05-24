const express = require('express');
const router = express.Router();
const monHocController = require('../controllers/monhoc.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// GET: Lấy danh sách (có thể ?search=...)
router.get('/', monHocController.handleGetAll);

// GET: Lấy chi tiết 1 môn
router.get('/:id', monHocController.handleGetById);

// POST: Tạo mới môn học
router.post('/',authenticateToken, authorizeRole('admin'), monHocController.handleCreate);

// PUT: Cập nhật hàng loạt môn học vào khoa
router.put('/bulk/assign-khoa', authenticateToken, authorizeRole('admin'), monHocController.handleBulkAssignKhoa);

// PUT: Cập nhật môn học
router.put('/:id',authenticateToken, authorizeRole('admin'), monHocController.handleUpdate);

// DELETE: Xóa môn học (Soft delete)
router.delete('/:id',authenticateToken, authorizeRole('admin'), monHocController.handleDelete);

router.post('/import',authenticateToken, authorizeRole('admin'), upload.single('file'), monHocController.importMonHocExcel);

module.exports = router;

