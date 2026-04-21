const express = require("express");
const router = express.Router();
const lopHocPhanController = require("../controllers/lophocphan.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get("/:lophocphan_id/sinhvien", lopHocPhanController.getStudentsByLopHocPhan);

router.get("/", authenticateToken, authorizeRole(['admin', 'lanhdao', 'truongbomon']), lopHocPhanController.getAll);
router.get("/lop-hoc-lai", lopHocPhanController.layDanhSachLopHocLai);
router.get('/lop-hoc-lai/:lophocphan_id/sinhvien', lopHocPhanController.laySinhVienLopHocLai);

router.post("/:lophocphan_id/import-excel", upload.single("file"), lopHocPhanController.importSinhVienExcel);

router.get("/:lophocphan_id/danh-sach-sinh-vien", lopHocPhanController.layDanhSachSinhVien);
router.get(
	"/:lophocphan_id/lop-hanh-chinh/:lop_hanhchinh_id/sinh-vien",
	lopHocPhanController.laySinhVienTheoLopHanhChinh
);
router.post(
	"/:lophocphan_id/lop-hanh-chinh/add-sinh-vien",
	lopHocPhanController.themSinhVienTuLopHanhChinh
);
router.delete(
	"/:lophocphan_id/sinh-vien/:sinhvien_id",
	lopHocPhanController.xoaSinhVienKhoiLopHocPhan
);

module.exports = router;


