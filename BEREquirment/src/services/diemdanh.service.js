'use strict';
const db = require('../models'); 
const { BuoiHoc, DiemDanh, SinhVien, DangKyHoc } = db;

class DiemDanhService {
  
  static async layBangDiemDanh({ lophocphan_id, ngay }) {
    // 1. Lấy danh sách tất cả sinh viên trong lớp
    const danhSachDangKy = await DangKyHoc.findAll({
      where: { 
        lophocphan_id: lophocphan_id,
        trangthai: 'active'
      },
      include: [
        {
          model: SinhVien,
          // SỬA LẠI DÒNG DƯỚI NÀY: Bỏ 'ho' đi
          attributes: ['sinhvien_id', 'ma_sv', 'ten', 'lop_hanhchinh_id'] 
        }
      ],
      raw: true,
      nest: true
    });

    const buoiHoc = await BuoiHoc.findOne({
      where: { lophocphan_id, ngay }
    });

    let chiTietDiemDanh = [];
    
    if (buoiHoc) {
      chiTietDiemDanh = await DiemDanh.findAll({
        where: { buoi_id: buoiHoc.buoi_id },
        raw: true
      });
    }

    const ketQua = danhSachDangKy.map(item => {
      const sv = item.SinhVien;
      const trangThaiDiemDanh = chiTietDiemDanh.find(dd => dd.sinhvien_id === sv.sinhvien_id);

      return {
        sinhvien_id: sv.sinhvien_id,
        ma_sv: sv.ma_sv,
        // SỬA LẠI DÒNG NÀY: Chỉ dùng sv.ten
        ho_ten: sv.ten, 
        trangthai: trangThaiDiemDanh ? trangThaiDiemDanh.trangthai : null, 
        ghichu: trangThaiDiemDanh ? trangThaiDiemDanh.ghichu : '',
        thoigian: trangThaiDiemDanh ? trangThaiDiemDanh.thoigian_danhdau : null
      };
    });

    return {
      thong_tin_buoi: buoiHoc || { trangthai: 'chưa tạo' },
      danh_sach_sinh_vien: ketQua
    };
  }

  // static async luuDiemDanh({ lophocphan_id, ngay, nguoi_tao, danh_sach_chi_tiet }) {
  //   const transaction = await db.sequelize.transaction();
  //   try {
  //     const [buoiHoc, created] = await BuoiHoc.findOrCreate({
  //       where: { lophocphan_id, ngay },
  //       defaults: {
  //         nguoi_tao: nguoi_tao,
  //         trangthai: 'completed',
  //         batdau: new Date()
  //       },
  //       transaction
  //     });

  //     // Nếu BuoiHoc đã tồn tại (admin tạo khi duyệt mở lại), cần update trangthai sang 'completed'
  //     if (!created && buoiHoc.trangthai !== 'completed') {
  //       await buoiHoc.update({ trangthai: 'completed' }, { transaction });
  //     }

  //     const duLieuDiemDanh = danh_sach_chi_tiet.map(item => ({
  //       buoi_id: buoiHoc.buoi_id,
  //       sinhvien_id: item.sinhvien_id,
  //       trangthai: item.trangthai,
  //       ghichu: item.ghichu || null,
  //       thoigian_danhdau: new Date()
  //     }));

  //     await DiemDanh.bulkCreate(duLieuDiemDanh, {
  //       updateOnDuplicate: ['trangthai', 'ghichu', 'thoigian_danhdau'],
  //       transaction
  //     });

  //     await transaction.commit();
  //     return { message: 'Lưu điểm danh thành công', buoi_id: buoiHoc.buoi_id, success: true };
  //   } catch (error) {
  //     await transaction.rollback();
  //     throw error;
  //   }
  // }



  static async luuDiemDanh({ lophocphan_id, ngay, nguoi_tao, danh_sach_chi_tiet }) {
        const transaction = await db.sequelize.transaction();
        try {
            const ngayChuan = typeof ngay === 'string' ? ngay.split('T')[0] : ngay.toISOString().split('T')[0];

            // BƯỚC 1: Tìm buổi học hiện có
            let buoiHoc = await BuoiHoc.findOne({
                where: { lophocphan_id, ngay: ngayChuan },
                transaction
            });

            // BƯỚC 2: Kiểm soát việc tạo buổi học mới
            if (!buoiHoc) {
                /**
                 * GIẢI THÍCH: 
                 * Nếu ngày này chưa có bản ghi BuoiHoc, nghĩa là Giảng viên đang bấm Lưu 
                 * vào một ngày "trống" (chưa được lên lịch hoặc chưa được Admin duyệt dời sang).
                 * Để không bị nhảy mẫu số (ví dụ từ 7 lên 8), ta có 2 hướng:
                 */
                
                // Hướng 1 (Khuyên dùng): Chặn - Bắt buộc phải có đề xuất dời lịch trước
                // throw new Error("Ngày này chưa được Admin duyệt lịch dạy. Vui lòng gửi đề xuất dời lịch hoặc dạy thay.");

                // Hướng 2: Vẫn cho lưu (Dạy bù đột xuất) nhưng đánh dấu là 'is_override'
                buoiHoc = await BuoiHoc.create({
                    lophocphan_id,
                    ngay: ngayChuan,
                    nguoi_tao: nguoi_tao,
                    trangthai: 'completed',
                    batdau: new Date(),
                    is_override: true // Cực kỳ quan trọng để phân biệt buổi phát sinh
                }, { transaction });
            } else {
                // Nếu đã có bản ghi (Đúng lịch, hoặc đã được Admin duyệt dời lịch/mở lại)
                // Cập nhật trạng thái về 'completed'
                await buoiHoc.update({
                    trangthai: 'completed',
                    nguoi_tao: nguoi_tao,
                    batdau: buoiHoc.batdau || new Date()
                }, { transaction });
            }

            // BƯỚC 3: Lưu chi tiết điểm danh cho từng sinh viên
            const duLieuDiemDanh = danh_sach_chi_tiet.map(item => ({
                buoi_id: buoiHoc.buoi_id,
                sinhvien_id: item.sinhvien_id,
                trangthai: item.trangthai,
                ghichu: item.ghichu || null,
                thoigian_danhdau: new Date()
            }));

            // Sử dụng bulkCreate với updateOnDuplicate để ghi đè nếu đã tồn tại (Upsert)
            await DiemDanh.bulkCreate(duLieuDiemDanh, {
                updateOnDuplicate: ['trangthai', 'ghichu', 'thoigian_danhdau'],
                transaction // Luôn luôn phải có transaction ở đây
            });

            await transaction.commit();
            return { 
                success: true, 
                message: 'Lưu điểm danh thành công', 
                buoi_id: buoiHoc.buoi_id 
            };

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error("LUU DIEM DANH ERROR:", error);
            throw error;
        }
    }



 

   static async  layBangDiemDanhMacDinh({ lophocphan_id, ngay }) {
  // 1. Lấy tất cả sinh viên đăng ký lớp
  const danhSachDangKy = await DangKyHoc.findAll({
    where: { lophocphan_id, trangthai: 'active' },
    include: [{ model: SinhVien, attributes: ['sinhvien_id', 'ma_sv', 'ten', 'lop_hanhchinh_id'] }],
    raw: true,
    nest: true
  });

  // 2. Lấy thông tin buổi học
  const buoiHoc = await BuoiHoc.findOne({ where: { lophocphan_id, ngay } });

  // 3. Lấy chi tiết điểm danh nếu có
  let chiTietDiemDanh = [];
  if (buoiHoc) {
    chiTietDiemDanh = await DiemDanh.findAll({ where: { buoi_id: buoiHoc.buoi_id }, raw: true });
  }

  // 4. Merge trạng thái, mặc định 'present'
  const ketQua = danhSachDangKy.map(item => {
    const sv = item.SinhVien;
    const dd = chiTietDiemDanh.find(d => d.sinhvien_id === sv.sinhvien_id);
    return {
      sinhvien_id: sv.sinhvien_id,
      ma_sv: sv.ma_sv,
      ho_ten: sv.ten,
      lop_hanhchinh_id: sv.lop_hanhchinh_id,
      trangthai: dd ? dd.trangthai : 'present',
      ghichu: dd ? dd.ghichu : '',
      thoigian: dd ? dd.thoigian_danhdau : null
    };
  });

  return { thong_tin_buoi: buoiHoc || { trangthai: 'chưa tạo' }, danh_sach_sinh_vien: ketQua };
}



}

module.exports = DiemDanhService;