'use strict';
const { Op } = require('sequelize');
const db = require('../models');

/**
 * Lấy lịch học của sinh viên trong một học kỳ
 */
const getStudentSchedule = async (sinhvien_id, hocky_id = null) => {
  try {
    let targetHocKyId = hocky_id;
    if (!targetHocKyId) {
      const nowStr = new Date().toISOString().split('T')[0];
      // 1. Tìm học kỳ đang diễn ra
      let activeHocKy = await db.HocKy.findOne({
        where: {
          ngay_batdau: { [Op.lte]: nowStr },
          ngay_ketthuc: { [Op.gte]: nowStr }
        }
      });
      // 2. Nếu không có học kỳ đang diễn ra, tìm học kỳ gần nhất đã bắt đầu
      if (!activeHocKy) {
        activeHocKy = await db.HocKy.findOne({
          where: { ngay_batdau: { [Op.lte]: nowStr } },
          order: [['ngay_batdau', 'DESC']]
        });
      }
      // 3. Nếu vẫn không thấy, lấy học kỳ mới nhất nói chung
      if (!activeHocKy) {
        activeHocKy = await db.HocKy.findOne({
          order: [['ngay_batdau', 'DESC']]
        });
      }
      if (activeHocKy) {
        targetHocKyId = activeHocKy.hocky_id;
      }
    }

    if (!targetHocKyId) return [];

    // Tìm các lớp học phần sinh viên đăng ký hoạt động
    const registrations = await db.DangKyHoc.findAll({
      where: {
        sinhvien_id,
        trangthai: 'active'
      },
      attributes: ['lophocphan_id']
    });

    const lhpIds = registrations.map(r => r.lophocphan_id).filter(Boolean);
    if (lhpIds.length === 0) return [];

    // Lấy tất cả các buổi học của các lớp học phần này thuộc học kỳ chỉ định
    const sessions = await db.BuoiHoc.findAll({
      where: {
        lophocphan_id: { [Op.in]: lhpIds }
      },
      include: [
        {
          model: db.LopHocPhan,
          as: 'LopHocPhan',
          where: { hocky_id: targetHocKyId },
          required: true,
          include: [
            { model: db.MonHoc, attributes: ['ten_mon', 'ma_mon', 'sotinchi'] },
            { model: db.GiangVien, attributes: ['ho', 'ten', 'sdt', 'email', 'ma_gv'] }
          ]
        },
        {
          model: db.GiangVien,
          as: 'GVDayThay',
          attributes: ['ho', 'ten', 'sdt', 'email', 'ma_gv'],
          required: false
        }
      ],
      order: [['ngay', 'ASC'], ['tiet_bat_dau', 'ASC']]
    });

    // Lấy trạng thái điểm danh của sinh viên đối với các buổi học này
    const sessionIds = sessions.map(s => s.buoi_id);
    const attendanceRecords = await db.DiemDanh.findAll({
      where: {
        sinhvien_id,
        buoi_id: { [Op.in]: sessionIds }
      },
      attributes: ['buoi_id', 'trangthai', 'ghichu', 'thoigian_danhdau']
    });

    const attendanceMap = new Map(attendanceRecords.map(a => [a.buoi_id, a]));

    return sessions.map(session => {
      const plainSession = session.get({ plain: true });
      const attend = attendanceMap.get(session.buoi_id);

      return {
        buoi_id: plainSession.buoi_id,
        ngay: plainSession.ngay,
        tiet_bat_dau: plainSession.tiet_bat_dau,
        so_tiet: plainSession.so_tiet,
        phong: plainSession.phong,
        trangthai_buoi: plainSession.trangthai, // e.g. 'scheduled', 'completed', 'cancelled'
        lop_hoc_phan: {
          lophocphan_id: plainSession.LopHocPhan?.lophocphan_id,
          ten_lophocphan: plainSession.LopHocPhan?.ten_lophocphan,
          ma_lop: plainSession.LopHocPhan?.ma_lop,
          mon_hoc: plainSession.LopHocPhan?.MonHoc,
          giang_vien: plainSession.LopHocPhan?.GiangVien
        },
        giang_vien_day_thay: plainSession.GVDayThay || null,
        diem_danh: attend ? {
          trangthai: attend.trangthai,
          ghichu: attend.ghichu,
          thoigian: attend.thoigian_danhdau
        } : null
      };
    });
  } catch (error) {
    console.error('Lỗi lấy lịch học sinh viên:', error);
    throw error;
  }
};

/**
 * Lấy quá trình điểm danh của sinh viên theo từng môn học trong học kỳ
 */
const getStudentAttendanceHistory = async (sinhvien_id, hocky_id = null) => {
  try {
    let targetHocKyId = hocky_id;
    if (!targetHocKyId) {
      const nowStr = new Date().toISOString().split('T')[0];
      // 1. Tìm học kỳ đang diễn ra
      let activeHocKy = await db.HocKy.findOne({
        where: {
          ngay_batdau: { [Op.lte]: nowStr },
          ngay_ketthuc: { [Op.gte]: nowStr }
        }
      });
      // 2. Nếu không có học kỳ đang diễn ra, tìm học kỳ gần nhất đã bắt đầu
      if (!activeHocKy) {
        activeHocKy = await db.HocKy.findOne({
          where: { ngay_batdau: { [Op.lte]: nowStr } },
          order: [['ngay_batdau', 'DESC']]
        });
      }
      // 3. Nếu vẫn không thấy, lấy học kỳ mới nhất nói chung
      if (!activeHocKy) {
        activeHocKy = await db.HocKy.findOne({
          order: [['ngay_batdau', 'DESC']]
        });
      }
      if (activeHocKy) {
        targetHocKyId = activeHocKy.hocky_id;
      }
    }

    if (!targetHocKyId) return [];

    // Lấy danh sách đăng ký học phần trong học kỳ
    const registrations = await db.DangKyHoc.findAll({
      where: {
        sinhvien_id,
        trangthai: 'active'
      },
      include: [
        {
          model: db.LopHocPhan,
          where: { hocky_id: targetHocKyId },
          required: true,
          include: [
            { model: db.MonHoc, attributes: ['ten_mon', 'ma_mon', 'sotinchi'] },
            { model: db.GiangVien, attributes: ['ho', 'ten', 'sdt', 'email', 'ma_gv'] }
          ]
        }
      ]
    });

    if (registrations.length === 0) return [];

    const results = [];

    for (const reg of registrations) {
      const lhp = reg.LopHocPhan;
      if (!lhp) continue;

      // Lấy tất cả các buổi học của lớp học phần này
      const sessions = await db.BuoiHoc.findAll({
        where: { lophocphan_id: lhp.lophocphan_id },
        include: [
          {
            model: db.GiangVien,
            as: 'GVDayThay',
            attributes: ['ho', 'ten', 'sdt', 'email', 'ma_gv'],
            required: false
          }
        ],
        order: [['ngay', 'ASC'], ['tiet_bat_dau', 'ASC']]
      });

      // Lấy tất cả các record điểm danh của sinh viên này cho lớp học phần
      const sessionIds = sessions.map(s => s.buoi_id);
      const attendanceRecords = sessionIds.length > 0 ? await db.DiemDanh.findAll({
        where: {
          sinhvien_id,
          buoi_id: { [Op.in]: sessionIds }
        }
      }) : [];

      const attendanceMap = new Map(attendanceRecords.map(a => [a.buoi_id, a]));

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      const details = sessions.map(session => {
        const plainSession = session.get({ plain: true });
        const attend = attendanceMap.get(session.buoi_id);

        let trangthai_diem_danh = 'not_yet';
        if (attend) {
          trangthai_diem_danh = attend.trangthai;
          if (attend.trangthai === 'present') presentCount++;
          else if (attend.trangthai === 'absent') absentCount++;
          else if (attend.trangthai === 'late') lateCount++;
          else if (attend.trangthai === 'excused') excusedCount++;
        } else if (session.trangthai === 'completed') {
          // Buổi học đã hoàn thành nhưng chưa có điểm danh của sinh viên này -> Mặc định có mặt
          trangthai_diem_danh = 'present';
          presentCount++;
        }

        return {
          buoi_id: plainSession.buoi_id,
          ngay: plainSession.ngay,
          tiet_bat_dau: plainSession.tiet_bat_dau,
          so_tiet: plainSession.so_tiet,
          phong: plainSession.phong,
          trangthai_buoi: plainSession.trangthai,
          giang_vien_day_thay: plainSession.GVDayThay || null,
          diem_danh: {
            trangthai: trangthai_diem_danh,
            ghichu: attend ? attend.ghichu : '',
            thoigian: attend ? attend.thoigian_danhdau : null
          }
        };
      });

      const tong_buoi = sessions.length;
      const tong_nghi = absentCount + excusedCount;
      const tile_nghi = tong_buoi > 0 ? parseFloat(((tong_nghi / tong_buoi) * 100).toFixed(2)) : 0;
      const canh_bao = tile_nghi > 20;

      results.push({
        lophocphan_id: lhp.lophocphan_id,
        ten_lophocphan: lhp.ten_lophocphan,
        ma_lop: lhp.ma_lop,
        mon_hoc: {
          ten_mon: lhp.MonHoc?.ten_mon,
          ma_mon: lhp.MonHoc?.ma_mon,
          sotinchi: lhp.MonHoc?.sotinchi
        },
        giang_vien: lhp.GiangVien ? {
          ho_ten: `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}`.trim(),
          sdt: lhp.GiangVien.sdt,
          email: lhp.GiangVien.email,
          ma_gv: lhp.GiangVien.ma_gv
        } : null,
        stats: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
          tong_nghi,
          tong_buoi,
          tile_nghi,
          canh_bao
        },
        chi_tiet_buoi_hoc: details
      });
    }

    return results;
  } catch (error) {
    console.error('Lỗi lấy quá trình điểm danh sinh viên:', error);
    throw error;
  }
};

module.exports = {
  getStudentSchedule,
  getStudentAttendanceHistory
};
