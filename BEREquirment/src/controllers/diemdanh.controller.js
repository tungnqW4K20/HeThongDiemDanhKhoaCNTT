'use strict';
const DiemDanhService = require('../services/diemdanh.service');

class DiemDanhController {
  
  
  static async layDanhSach(req, res) {
    try {
      const { lophocphan_id, ngay } = req.query;

      if (!lophocphan_id || !ngay) {
        return res.status(400).json({
          error: 'Thiếu tham số lophocphan_id hoặc ngay'
        });
      }

      const data = await DiemDanhService.layBangDiemDanh({ lophocphan_id, ngay });
      
      return res.status(200).json({
        message: 'Lấy dữ liệu thành công',
        data: data
      });
    } catch (error) {
      console.error('Lỗi lấy điểm danh:', error);
      return res.status(500).json({
        error: 'Lỗi server',
        details: error.message
      });
    }
  }

  // POST: /api/diemdanh
  // Body: { lophocphan_id, ngay, danh_sach: [...] }
  static async luuKetQua(req, res) {
    try {
      const { lophocphan_id, ngay, danh_sach } = req.body;
      
      // Lấy ID người tạo từ token (giả sử bạn đã có middleware auth gán vào req.user)
      // Nếu chưa có auth thì tạm thời truyền cứng hoặc lấy từ body
      const nguoi_tao = req.user ? req.user.taikhoan_id : req.body.nguoi_tao; 

      if (!lophocphan_id || !ngay || !danh_sach || !Array.isArray(danh_sach)) {
        return res.status(400).json({
          error: 'Dữ liệu đầu vào không hợp lệ'
        });
      }

      const result = await DiemDanhService.luuDiemDanh({
        lophocphan_id,
        ngay,
        nguoi_tao,
        danh_sach_chi_tiet: danh_sach
      });

      return res.status(200).json(result);

    } catch (error) {
      console.error('Lỗi lưu điểm danh:', error);
      return res.status(500).json({
        error: 'Lỗi server khi lưu điểm danh',
        details: error.message
      });
    }
  }

  static async layDanhSach(req, res) {
    try {
      const { lophocphan_id, ngay } = req.query;
      if (!lophocphan_id || !ngay) return res.status(400).json({ error: 'Thiếu tham số' });

      const data = await DiemDanhService.layBangDiemDanhMacDinh({ lophocphan_id, ngay });
      return res.status(200).json({ message: 'Lấy danh sách mặc định thành công', data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
  }

}

module.exports = DiemDanhController;