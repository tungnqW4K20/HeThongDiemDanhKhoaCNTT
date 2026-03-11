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
   * 2. Biểu đồ theo thời gian:
   *   - day   → tỷ lệ từng lớp có buổi học hôm nay
   *   - week  → tỷ lệ từng ngày trong tuần (T2–CN)
   *   - month → tỷ lệ từng tuần trong tháng đã chọn
   *   - year  → tỷ lệ từng tháng trong năm đã chọn
   */
  static async getChartData(filter, year, month) {
    const today = dayjs();
    const todayStr = today.format('YYYY-MM-DD');
    const targetYear  = parseInt(year)  || today.year();
    const targetMonth = parseInt(month) || today.month() + 1; // 1-indexed

    // ── HÔM NAY: mỗi lớp hành chính có buổi học hôm nay ──────────────────
    if (filter === 'day') {
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
              where: { ngay: todayStr, trangthai: 'completed' }
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

    // ── TUẦN NÀY: mỗi ngày trong tuần ────────────────────────────────────
    if (filter === 'week') {
      const startOfWeek = today.startOf('week');
      const startStr = startOfWeek.format('YYYY-MM-DD');

      const rows = await db.DiemDanh.findAll({
        attributes: [
          [literal('DATE(`BuoiHoc`.`ngay`)'), 'ngay'],
          [fn('COUNT', col('DiemDanh.diemdanh_id')), 'total'],
          [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` = 'present' THEN 1 ELSE 0 END)`), 'present_count'],
          [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` IN ('late', 'excused') THEN 1 ELSE 0 END)`), 'late_count'],
        ],
        include: [{
          model: db.BuoiHoc, as: 'BuoiHoc', attributes: [],
          where: { ngay: { [Op.between]: [startStr, todayStr] }, trangthai: 'completed' }
        }],
        group: [literal('DATE(`BuoiHoc`.`ngay`)')],
        order: [[literal('DATE(`BuoiHoc`.`ngay`)'), 'ASC']],
        raw: true
      });

      const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const result = [];
      for (let i = 0; i < 7; i++) {
        const d = startOfWeek.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        if (dateStr > todayStr) break;
        const row = rows.find(r => String(r.ngay).slice(0, 10) === dateStr);
        const total = row ? (parseInt(row.total) || 0) : 0;
        const p = row ? (parseInt(row.present_count) || 0) : 0;
        const l = row ? (parseInt(row.late_count) || 0) : 0;
        result.push({
          name: DAY_NAMES[d.day()],
          date: d.format('DD/MM'),
          present: total > 0 ? Math.round((p / total) * 100) : 0,
          late:    total > 0 ? Math.round((l / total) * 100) : 0,
          absent:  total > 0 ? Math.round(((total - p - l) / total) * 100) : 0
        });
      }
      return result;
    }

    // ── THÁNG: mỗi tuần trong tháng đã chọn ──────────────────────────────
    if (filter === 'month') {
      const startOfMonth = dayjs(`${targetYear}-${String(targetMonth).padStart(2,'0')}-01`);
      const endOfMonth   = startOfMonth.endOf('month');
      const startStr = startOfMonth.format('YYYY-MM-DD');
      // Không vượt quá hôm nay
      const endStr = endOfMonth.format('YYYY-MM-DD') < todayStr
        ? endOfMonth.format('YYYY-MM-DD') : todayStr;

      const rows = await db.DiemDanh.findAll({
        attributes: [
          [literal('DATE(`BuoiHoc`.`ngay`)'), 'ngay'],
          [fn('COUNT', col('DiemDanh.diemdanh_id')), 'total'],
          [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` = 'present' THEN 1 ELSE 0 END)`), 'present_count'],
          [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` IN ('late', 'excused') THEN 1 ELSE 0 END)`), 'late_count'],
        ],
        include: [{
          model: db.BuoiHoc, as: 'BuoiHoc', attributes: [],
          where: { ngay: { [Op.between]: [startStr, endStr] }, trangthai: 'completed' }
        }],
        group: [literal('DATE(`BuoiHoc`.`ngay`)')],
        order: [[literal('DATE(`BuoiHoc`.`ngay`)'), 'ASC']],
        raw: true
      });

      const weekBuckets = {};
      rows.forEach(r => {
        const dayOfMonth = parseInt(String(r.ngay).slice(8, 10));
        const w = Math.ceil(dayOfMonth / 7);
        if (!weekBuckets[w]) weekBuckets[w] = { total: 0, present: 0, late: 0 };
        weekBuckets[w].total   += parseInt(r.total) || 0;
        weekBuckets[w].present += parseInt(r.present_count) || 0;
        weekBuckets[w].late    += parseInt(r.late_count) || 0;
      });

      const lastDay = Math.min(endOfMonth.date(), parseInt(endStr.slice(8, 10)));
      const totalWeeks = Math.ceil(lastDay / 7);
      return Array.from({ length: totalWeeks }, (_, i) => {
        const w = i + 1;
        const b = weekBuckets[w] || { total: 0, present: 0, late: 0 };
        return {
          name: `Tuần ${w}`,
          present: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
          late:    b.total > 0 ? Math.round((b.late / b.total) * 100) : 0,
          absent:  b.total > 0 ? Math.round(((b.total - b.present - b.late) / b.total) * 100) : 0
        };
      });
    }

    // ── NĂM: mỗi tháng trong năm đã chọn (T1–T12) ────────────────────────
    const yearStart = `${targetYear}-01-01`;
    const yearEnd   = `${targetYear}-12-31` < todayStr ? `${targetYear}-12-31` : todayStr;

    const rows = await db.DiemDanh.findAll({
      attributes: [
        [literal('MONTH(`BuoiHoc`.`ngay`)'), 'thang'],
        [fn('COUNT', col('DiemDanh.diemdanh_id')), 'total'],
        [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` = 'present' THEN 1 ELSE 0 END)`), 'present_count'],
        [literal(`SUM(CASE WHEN \`DiemDanh\`.\`trangthai\` IN ('late', 'excused') THEN 1 ELSE 0 END)`), 'late_count'],
      ],
      include: [{
        model: db.BuoiHoc, as: 'BuoiHoc', attributes: [],
        where: { ngay: { [Op.between]: [yearStart, yearEnd] }, trangthai: 'completed' }
      }],
      group: [literal('MONTH(`BuoiHoc`.`ngay`)')],
      order: [[literal('MONTH(`BuoiHoc`.`ngay`)'), 'ASC']],
      raw: true
    });

    const lastMonth = targetYear < today.year() ? 12 : today.month() + 1;
    return Array.from({ length: lastMonth }, (_, i) => {
      const m = i + 1;
      const row = rows.find(r => parseInt(r.thang) === m);
      const total = row ? (parseInt(row.total) || 0) : 0;
      const p = row ? (parseInt(row.present_count) || 0) : 0;
      const l = row ? (parseInt(row.late_count) || 0) : 0;
      return {
        name: `T${m}`,
        present: total > 0 ? Math.round((p / total) * 100) : 0,
        late:    total > 0 ? Math.round((l / total) * 100) : 0,
        absent:  total > 0 ? Math.round(((total - p - l) / total) * 100) : 0
      };
    });
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