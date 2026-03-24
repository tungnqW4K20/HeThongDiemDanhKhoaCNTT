const express = require("express");
const router = express.Router();
const lopHocPhanController = require("../controllers/lophocphan.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get("/:lophocphan_id/sinhvien", lopHocPhanController.getStudentsByLopHocPhan);

router.get("/", authenticateToken, authorizeRole(['admin', 'lanhdao']), lopHocPhanController.getAll);
router.get("/lop-hoc-lai", lopHocPhanController.layDanhSachLopHocLai);
router.get('/lop-hoc-lai/:lophocphan_id/sinhvien', lopHocPhanController.laySinhVienLopHocLai);

router.post("/:lophocphan_id/import-excel", upload.single("file"), lopHocPhanController.importSinhVienExcel);

router.get("/:lophocphan_id/danh-sach-sinh-vien", lopHocPhanController.layDanhSachSinhVien);

module.exports = router;


