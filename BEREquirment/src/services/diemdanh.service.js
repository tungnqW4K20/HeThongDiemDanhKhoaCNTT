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

    const lhp = await db.LopHocPhan.findOne({ where: { lophocphan_id } });
    const tongSoBuoiKeHoach = lhp && lhp.tuan_hoc ? (Array.isArray(lhp.tuan_hoc) ? lhp.tuan_hoc.length : JSON.parse(lhp.tuan_hoc).length) : 0;

    const completedBuoi = await db.BuoiHoc.findAll({
      where: { lophocphan_id, trangthai: 'completed' },
      attributes: ['buoi_id']
    });
    const completedBuoiIds = completedBuoi.map(b => b.buoi_id);

    const completedAttendances = completedBuoiIds.length > 0
      ? await db.DiemDanh.findAll({
          where: { buoi_id: completedBuoiIds },
          attributes: ['sinhvien_id', 'trangthai']
        })
      : [];

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

      const svAttendances = completedAttendances.filter(dd => dd.sinhvien_id === sv.sinhvien_id);
      const soBuoiVang = svAttendances.filter(dd => dd.trangthai === 'absent').length;
      const tiLeVang = tongSoBuoiKeHoach > 0 ? (soBuoiVang / tongSoBuoiKeHoach) * 100 : 0;
      const canhBao = tiLeVang >= 20;

      return {
        sinhvien_id: sv.sinhvien_id,
        lophocphan_id: lophocphan_id,
        ma_sv: sv.ma_sv,
        ho_ten: sv.ten, 
        trangthai: trangThaiDiemDanh ? trangThaiDiemDanh.trangthai : 'present', 
        ghichu: trangThaiDiemDanh ? trangThaiDiemDanh.ghichu : '',
        thoigian: trangThaiDiemDanh ? trangThaiDiemDanh.thoigian_danhdau : null,
        so_buoi_vang: soBuoiVang,
        tong_so_buoi: tongSoBuoiKeHoach,
        ti_le_vang: Number(tiLeVang.toFixed(2)),
        canh_bao: canhBao
      };
    });

    const total = ketQua.length;
    const marked = ketQua.filter(item => item.trangthai).length;
    const present = ketQua.filter(item => ['present', 'late', 'excused'].includes(item.trangthai)).length;

    return {
      thong_tin_buoi: buoiHoc || { trangthai: 'chưa tạo' },
      danh_sach_sinh_vien: ketQua,
      thong_ke: { total, marked, present }
    };
  }

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
                buoiHoc = await BuoiHoc.create({
                    lophocphan_id,
                    ngay: ngayChuan,
                    nguoi_tao: nguoi_tao,
                    trangthai: 'completed',
                    batdau: new Date(),
                    is_override: true 
                }, { transaction });
            } else {
                await buoiHoc.update({
                    trangthai: 'completed',
                    nguoi_tao: nguoi_tao,
                    batdau: buoiHoc.batdau || new Date()
                }, { transaction });
            }

            // BƯỚC 3: Lấy hocky_id từ LopHocPhan của buổi học để lưu phi chuẩn hóa vào DiemDanh
            const lhp = await db.LopHocPhan.findOne({
                where: { lophocphan_id },
                attributes: ['hocky_id'],
                transaction
            });
            const hocky_id = lhp?.hocky_id || null;

            // BƯỚC 4: Tách danh sách sinh viên theo Exception-based
            const listException = [];
            const listNormalSvIds = [];

            danh_sach_chi_tiet.forEach(item => {
                const isNormal = item.trangthai === 'present' && (!item.ghichu || item.ghichu.trim() === '');
                if (isNormal) {
                    listNormalSvIds.push(item.sinhvien_id);
                } else {
                    listException.push({
                        buoi_id: buoiHoc.buoi_id,
                        sinhvien_id: item.sinhvien_id,
                        hocky_id: hocky_id,
                        trangthai: item.trangthai,
                        ghichu: item.ghichu || null,
                        thoigian_danhdau: new Date()
                    });
                }
            });

            // Xóa bản ghi 'present' cũ (nếu có)
            if (listNormalSvIds.length > 0) {
                await DiemDanh.destroy({
                    where: {
                        buoi_id: buoiHoc.buoi_id,
                        sinhvien_id: listNormalSvIds
                    },
                    transaction
                });
            }

            // Ghi nhận các ngoại lệ vào bảng DiemDanh (Upsert)
            if (listException.length > 0) {
                await DiemDanh.bulkCreate(listException, {
                    updateOnDuplicate: ['trangthai', 'ghichu', 'thoigian_danhdau', 'hocky_id'],
                    transaction 
                });
            }

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

  const lhp = await db.LopHocPhan.findOne({ where: { lophocphan_id } });
  const tongSoBuoiKeHoach = lhp && lhp.tuan_hoc ? (Array.isArray(lhp.tuan_hoc) ? lhp.tuan_hoc.length : JSON.parse(lhp.tuan_hoc).length) : 0;

  const completedBuoi = await db.BuoiHoc.findAll({
    where: { lophocphan_id, trangthai: 'completed' },
    attributes: ['buoi_id']
  });
  const completedBuoiIds = completedBuoi.map(b => b.buoi_id);

  const completedAttendances = completedBuoiIds.length > 0
    ? await db.DiemDanh.findAll({
        where: { buoi_id: completedBuoiIds },
        attributes: ['sinhvien_id', 'trangthai']
      })
    : [];

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

    const svAttendances = completedAttendances.filter(dd => dd.sinhvien_id === sv.sinhvien_id);
    const soBuoiVang = svAttendances.filter(dd => dd.trangthai === 'absent').length;
    const tiLeVang = tongSoBuoiKeHoach > 0 ? (soBuoiVang / tongSoBuoiKeHoach) * 100 : 0;
    const canhBao = tiLeVang >= 20;

    return {
      sinhvien_id: sv.sinhvien_id,
      lophocphan_id: lophocphan_id,
      ma_sv: sv.ma_sv,
      ho_ten: sv.ten,
      lop_hanhchinh_id: sv.lop_hanhchinh_id,
      trangthai: dd ? dd.trangthai : 'present',
      ghichu: dd ? dd.ghichu : '',
      thoigian: dd ? dd.thoigian_danhdau : null,
      so_buoi_vang: soBuoiVang,
      tong_so_buoi: tongSoBuoiKeHoach,
      ti_le_vang: Number(tiLeVang.toFixed(2)),
      canh_bao: canhBao
    };
  });

  const total = ketQua.length;
  const marked = ketQua.filter(item => item.trangthai).length;
  const present = ketQua.filter(item => ['present', 'late', 'excused'].includes(item.trangthai)).length;

  return { thong_tin_buoi: buoiHoc || { trangthai: 'chưa tạo' }, danh_sach_sinh_vien: ketQua, thong_ke: { total, marked, present } };
}



}

module.exports = DiemDanhService;