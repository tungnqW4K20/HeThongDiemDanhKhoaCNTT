'use strict';
const db = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const dayjs = require('dayjs');

class DashboardService {
  /**
   * 1. Thống kê theo lớp hành chính (Giữ nguyên logic chuyên sâu)
   */
  static async getStatsByClass() {
    const today = dayjs().format('YYYY-MM-DD');
    const [totalStudents, totalClassesToday, activeClasses, classAttendance] = await Promise.all([
      db.SinhVien.count({ where: { isDeleted: false } }),
      db.BuoiHoc.count({ where: { ngay: today } }),
      db.BuoiHoc.count({ where: { ngay: today, trangthai: 'scheduled' } }),
      db.LopHanhChinh.findAll({
        where: { isDeleted: false },
        attributes: [
          'lop_hanhchinh_id', 'ten_lop',
          [fn('COUNT', col('DanhSachSinhVien->DanhSachDiemDanh.diemdanh_id')), 'total'],
          [literal(`SUM(CASE WHEN \`DanhSachSinhVien->DanhSachDiemDanh\`.trangthai = 'present' THEN 1 ELSE 0 END)`), 'present']
        ],
        include: [{
          model: db.SinhVien, as: 'DanhSachSinhVien', attributes: [],
          include: [{ model: db.DiemDanh, as: 'DanhSachDiemDanh', attributes: [] }]
        }],
        group: ['LopHanhChinh.lop_hanhchinh_id', 'LopHanhChinh.ten_lop'],
        raw: true, subQuery: false
      })
    ]);

    let t = 0, p = 0;
    classAttendance.forEach(i => { t += parseInt(i.total); p += parseInt(i.present); });

    return {
      totalStudents: totalStudents.toLocaleString('vi-VN'),
      totalClassesToday,
      activeClasses,
      avgAttendance: t > 0 ? `${Math.round((p / t) * 100)}%` : '0%',
      alertCount: 0 // Sẽ được Controller cập nhật sau
    };
  }

  /**
   * 2. Biểu đồ theo lớp hành chính (Xử lý lớp ghép)
   */
  static async getChartData(filter) {
    const start = filter === 'month' ? dayjs().startOf('month') : dayjs().startOf('week');
    const data = await db.LopHanhChinh.findAll({
      where: { isDeleted: false },
      attributes: [
        'ten_lop',
        [fn('COUNT', col('DanhSachSinhVien->DanhSachDiemDanh.diemdanh_id')), 'total'],
        [literal(`SUM(CASE WHEN \`DanhSachSinhVien->DanhSachDiemDanh\`.trangthai = 'present' THEN 1 ELSE 0 END)`), 'present'],
        [literal(`SUM(CASE WHEN \`DanhSachSinhVien->DanhSachDiemDanh\`.trangthai IN ('late', 'excused') THEN 1 ELSE 0 END)`), 'late']
      ],
      include: [{
        model: db.SinhVien, as: 'DanhSachSinhVien', attributes: [],
        include: [{
          model: db.DiemDanh, as: 'DanhSachDiemDanh', attributes: [],
          include: [{ 
            model: db.BuoiHoc, as: 'BuoiHoc', attributes: [],
            where: { ngay: { [Op.between]: [start.format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')] }, trangthai: 'completed' }
          }]
        }]
      }],
      group: ['LopHanhChinh.lop_hanhchinh_id', 'LopHanhChinh.ten_lop'],
      raw: true, subQuery: false
    });

    return data.map(i => {
      const total = parseInt(i.total) || 0;
      if (total === 0) return null;
      const p = parseInt(i.present) || 0;
      const l = parseInt(i.late) || 0;
      return {
        name: i.ten_lop,
        present: Math.round((p / total) * 100),
        late: Math.round((l / total) * 100),
        absent: Math.round(((total - p - l) / total) * 100)
      };
    }).filter(Boolean);
  }

  /**
   * 3. Lịch dạy chi tiết (🔥 FIX LỚP GHÉP: Lấy nhiều lớp hành chính)
   */
  static async getTodaySchedule() {
    const today = dayjs().format('YYYY-MM-DD');
    const list = await db.BuoiHoc.findAll({
      where: { ngay: today },
      attributes: ['buoi_id', 'trangthai', 'phong', 'tiet_bat_dau', 'so_tiet'],
      include: [
        {
          model: db.LopHocPhan, as: 'LopHocPhan',
          include: [
            { model: db.MonHoc, attributes: ['ten_mon'] },
            { model: db.GiangVien, attributes: ['ho', 'ten'] },
            { 
                model: db.LopHanhChinh, 
                as: 'DanhSachLopHanhChinh', // Alias N-N trong Model LopHocPhan
                attributes: ['ten_lop'],
                through: { attributes: [] } 
            }
          ]
        },
        { model: db.DiemDanh, as: 'DanhSachDiemDanh', attributes: ['trangthai'] }
      ],
      order: [[literal('COALESCE(`BuoiHoc`.`tiet_bat_dau`, `LopHocPhan`.`tiet_bat_dau`)'), 'ASC']]
    });

    return list.map(buoi => {
      const lhp = buoi.LopHocPhan;
      if (!lhp) return null;

      // 🔥 Xử lý lớp ghép: Nối tên tất cả lớp hành chính
      const dsLop = lhp.DanhSachLopHanhChinh || [];
      const tenLopGhep = dsLop.map(l => l.ten_lop).join(' + ') || 'Lớp tự do';

      const attendance = buoi.DanhSachDiemDanh || [];
      const present = attendance.filter(a => a.trangthai === 'present').length;

      return {
        id: buoi.buoi_id,
        subject: lhp.MonHoc?.ten_mon,
        code: tenLopGhep, // Hiển thị chuỗi lớp ghép
        room: buoi.phong || lhp.phong,
        time: `Tiết ${buoi.tiet_bat_dau || lhp.tiet_bat_dau}`,
        lecturer: `${lhp.GiangVien?.ho} ${lhp.GiangVien?.ten}`,
        status: buoi.trangthai,
        attendance: `${present}/${attendance.length}`
      };
    }).filter(Boolean);
  }

  /**
   * 4. Cảnh báo vắng
   */
  static async getAlerts() {
    const results = await db.DiemDanh.findAll({
      where: { trangthai: 'absent' },
      attributes: ['sinhvien_id', [fn('COUNT', col('DiemDanh.diemdanh_id')), 'absent_count']],
      include: [
        { 
          model: db.SinhVien, as: 'SinhVien', attributes: ['ma_sv', 'ten'],
          include: [{ model: db.LopHanhChinh, as: 'Lop', attributes: ['ten_lop'] }]
        },
        { 
          model: db.BuoiHoc, as: 'BuoiHoc', attributes: [],
          include: [{ model: db.LopHocPhan, as: 'LopHocPhan', attributes: [], include: [{ model: db.MonHoc, attributes: ['ten_mon'] }] }]
        }
      ],
      group: [
        'DiemDanh.sinhvien_id', 'SinhVien.sinhvien_id', 'SinhVien.ma_sv', 'SinhVien.ten',
        'SinhVien->Lop.lop_hanhchinh_id', 'SinhVien->Lop.ten_lop',
        'BuoiHoc->LopHocPhan->MonHoc.monhoc_id', 'BuoiHoc->LopHocPhan->MonHoc.ten_mon'
      ],
      having: literal('COUNT(diemdanh_id) >= 3'),
      order: [[literal('absent_count'), 'DESC']],
      limit: 10, raw: true, nest: true
    });

    return results.map(item => ({
      student: item.SinhVien.ten,
      idNum: item.SinhVien.ma_sv,
      class: item.SinhVien.Lop.ten_lop,
      absentCount: item.absent_count,
      subject: item.BuoiHoc.LopHocPhan.MonHoc.ten_mon
    }));
  }
}

module.exports = DashboardService;