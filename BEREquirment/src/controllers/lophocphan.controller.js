// controllers/lophocphan.controller.js
const lopHocPhanService = require('../services/LopHocPhan.service');
const db = require('../models');

const resolveScopeForPartClass = async (user = {}) => {
  const { role, khoa_id, chuyennganh_id, id } = user;

  if (role !== 'truongbomon') {
    return {
      targetKhoaId: role === 'lanhdao' ? (khoa_id || null) : null,
      targetChuyenNganhId: null
    };
  }

  const boMon = await db.BoMon.findOne({
    where: {
      truong_bomon_id: id || null,
      isDeleted: false
    },
    attributes: ['bomon_id', 'khoa_id']
  });

  return {
    targetKhoaId: boMon?.khoa_id || khoa_id || null,
    targetChuyenNganhId: boMon?.bomon_id || chuyennganh_id || null
  };
};

const getStudentsByLopHocPhan = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    const { ngay } = req.query; 

    if (!lophocphan_id) {
      return res.status(400).json({ success: false, message: "Thiếu lophocphan_id" });
    }

    const data = await lopHocPhanService.getStudentsByLopHocPhan(lophocphan_id, ngay);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sinh viên lớp học phần thành công.",
      data: data.map(item => item.SinhVien) // chỉ trả sinh viên
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// const getAll = async (req, res) => {
//     try {
//         const query = req.query;
//         const result = await lopHocPhanService.getAllLopHocPhan(query);

//         return res.status(200).json({
//             success: true,
//             message: 'Lấy danh sách lớp học phần thành công',
//             data: result.data
//         });
//     } catch (error) {
//         console.error('Controller Error:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Lỗi server',
//             error: error.message
//         });
//     }
// };
const getAll = async (req, res) => {
    try {
        const { hocky_id } = req.query;
        const { targetKhoaId, targetChuyenNganhId } = await resolveScopeForPartClass(req.user || {});

        // Bắt buộc phải có học kỳ mới lấy được lớp học phần
        if (!hocky_id) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp hocky_id'
            });
        }

        const result = await lopHocPhanService.getAllLopHocPhan(req.query, targetKhoaId, targetChuyenNganhId);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách lớp học phần thành công',
            data: result.data
        });
    } catch (error) {
        console.error('Controller Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

const capNhatThongTinLopHocPhan = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    const result = await lopHocPhanService.updateLopHocPhanInfo(lophocphan_id, req.body || {});

    if (!result?.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const layDanhSachLopHocLai = async (req, res) => {
  try {
    const lopHocLaiList = await lopHocPhanService.getAllLopHocLai();
    res.json({
      success: true,
      data: lopHocLaiList
    });
  } catch (error) {
    console.error('Lỗi lấy lớp học lại:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/lophoclai/:lophocphan_id/sinhvien
const laySinhVienLopHocLai = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    const svList = await lopHocPhanService.getSinhVienByLopHocLai(lophocphan_id);
    res.json({
      success: true,
      data: svList
    });
  } catch (error) {
    console.error('Lỗi lấy sinh viên lớp học lại:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const importSinhVienExcel = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng đính kèm file Excel." });
    }

    const result = await lopHocPhanService.importSinhVienFromExcel(lophocphan_id, req.file.buffer);

    return res.status(200).json({
      success: true,
      message: "Import thành công.",
      summary: result
    });
  } catch (error) {
    if (error.details) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu Excel có lỗi. Vui lòng kiểm tra lại.",
        errors: error.details
      });
    }

    console.error("Import Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi server khi import dữ liệu."
    });
  }
};

const layDanhSachSinhVien = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    
    if (!lophocphan_id) {
      return res.status(400).json({ success: false, message: "Thiếu ID lớp học phần" });
    }

    const data = await lopHocPhanService.getDanhSachSinhVien(lophocphan_id);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sinh viên thành công",
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const laySinhVienTheoLopHanhChinh = async (req, res) => {
  try {
    const { lophocphan_id, lop_hanhchinh_id } = req.params;

    if (!lophocphan_id || !lop_hanhchinh_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu lophocphan_id hoặc lop_hanhchinh_id'
      });
    }

    const result = await lopHocPhanService.getSinhVienTheoLopHanhChinh(lophocphan_id, lop_hanhchinh_id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const themSinhVienTuLopHanhChinh = async (req, res) => {
  try {
    const { lophocphan_id } = req.params;
    const { lop_hanhchinh_id, sinhvien_ids } = req.body || {};

    if (!lophocphan_id || !lop_hanhchinh_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu lophocphan_id hoặc lop_hanhchinh_id'
      });
    }

    if (!Array.isArray(sinhvien_ids) || sinhvien_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ít nhất một sinh viên'
      });
    }

    const result = await lopHocPhanService.addSinhVienTuLopHanhChinh(
      lophocphan_id,
      lop_hanhchinh_id,
      sinhvien_ids
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const xoaSinhVienKhoiLopHocPhan = async (req, res) => {
  try {
    const { lophocphan_id, sinhvien_id } = req.params;

    if (!lophocphan_id || !sinhvien_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu lophocphan_id hoặc sinhvien_id'
      });
    }

    const result = await lopHocPhanService.removeSinhVienKhoiLopHocPhan(lophocphan_id, sinhvien_id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { 
  getStudentsByLopHocPhan,
  getAll,
  capNhatThongTinLopHocPhan,
  layDanhSachLopHocLai,
  laySinhVienLopHocLai,
  importSinhVienExcel,
  layDanhSachSinhVien,
  laySinhVienTheoLopHanhChinh,
  themSinhVienTuLopHanhChinh,
  xoaSinhVienKhoiLopHocPhan
 };
