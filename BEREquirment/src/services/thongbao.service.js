'use strict';
const db = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

/**
 * Tạo thông báo cảnh báo sinh viên cho GV chủ nhiệm và GV học phần
 */
const createStudentWarningNotification = async ({ sinhvien_id, lophocphan_id, ti_le_vang }) => {
  try {
    // 1. Tìm thông tin sinh viên và lớp hành chính (để lấy GV chủ nhiệm)
    const sinhvien = await db.SinhVien.findOne({
      where: { sinhvien_id },
      include: [{
        model: db.LopHanhChinh,
        as: 'Lop',
        attributes: ['lop_hanhchinh_id', 'ten_lop', 'giangvien_id']
      }]
    });

    if (!sinhvien) {
      return { success: false, message: 'Sinh viên không tồn tại' };
    }

    // 2. Tìm thông tin lớp học phần (để lấy GV học phần)
    const lophocphan = await db.LopHocPhan.findOne({
      where: { lophocphan_id },
      attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'giangvien_id']
    });

    if (!lophocphan) {
      return { success: false, message: 'Lớp học phần không tồn tại' };
    }

    const homeroomTeacherId = sinhvien.Lop?.giangvien_id;
    const courseTeacherId = lophocphan.giangvien_id;

    // 3. Tìm tài khoản tương ứng của các giảng viên
    const targetGiangVienIds = [homeroomTeacherId, courseTeacherId].filter(Boolean);
    if (targetGiangVienIds.length === 0) {
      return { success: false, message: 'Không tìm thấy giảng viên liên quan' };
    }

    const accounts = await db.TaiKhoan.findAll({
      where: {
        ref_id: { [Op.in]: targetGiangVienIds }
      },
      attributes: ['taikhoan_id', 'ref_id']
    });

    if (accounts.length === 0) {
      return { success: false, message: 'Không tìm thấy tài khoản hệ thống của giảng viên' };
    }

    // Tiêu đề & Nội dung thông báo
    const tieude = 'Cảnh báo chuyên cần sinh viên';
    const noidung = `Sinh viên ${sinhvien.ten} (${sinhvien.ma_sv}) thuộc lớp ${sinhvien.Lop?.ten_lop || 'N/A'} có tỷ lệ vắng mặt học phần ${lophocphan.ten_lophocphan} là ${ti_le_vang}%. Vui lòng kiểm tra và xử lý.`;
    const metadataStr = JSON.stringify({
      sinhvien_id,
      lophocphan_id,
      ma_sv: sinhvien.ma_sv,
      ten_sv: sinhvien.ten,
      ten_lop: lophocphan.ten_lophocphan,
      ti_le_vang
    });

    const notificationsToCreate = [];
    const uniqueAccountIds = new Set(accounts.map(a => a.taikhoan_id));

    for (const taikhoan_id of uniqueAccountIds) {
      notificationsToCreate.push({
        nguoi_nhan_id: taikhoan_id,
        tieude,
        noidung,
        loai_thong_bao: 'canh_bao_sinh_vien',
        metadata: metadataStr,
        is_read: false,
        ngay_tao: new Date()
      });
    }

    await db.ThongBao.bulkCreate(notificationsToCreate);

    return { success: true, message: 'Gửi thông báo thành công' };
  } catch (error) {
    console.error('Lỗi khi tạo thông báo cảnh báo sinh viên:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Lấy danh sách thông báo của tài khoản hiện tại
 */
const getMyNotifications = async (taikhoan_id) => {
  try {
    const notifications = await db.ThongBao.findAll({
      where: { nguoi_nhan_id: taikhoan_id },
      order: [['ngay_tao', 'DESC']]
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error('Lỗi khi lấy thông báo:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Đánh dấu thông báo đã đọc
 */
const markAsRead = async (thongbao_id, taikhoan_id) => {
  try {
    const notification = await db.ThongBao.findOne({
      where: { thongbao_id, nguoi_nhan_id: taikhoan_id }
    });

    if (!notification) {
      return { success: false, message: 'Thông báo không tồn tại hoặc bạn không có quyền' };
    }

    await notification.update({ is_read: true });
    return { success: true, message: 'Đã đánh dấu đã đọc' };
  } catch (error) {
    console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Tính toán các buổi học trong ngày chưa điểm danh
 */
const getMissedAttendanceToday = async (giangvien_id) => {
  try {
    const todayStr = dayjs().format('YYYY-MM-DD');

    const missedSessions = await db.BuoiHoc.findAll({
      where: {
        ngay: todayStr,
        trangthai: 'scheduled',
        [Op.or]: [
          { giangvien_day_thay_id: giangvien_id },
          {
            [Op.and]: [
              { '$LopHocPhan.giangvien_id$': giangvien_id },
              { giangvien_day_thay_id: null }
            ]
          }
        ]
      },
      attributes: ['buoi_id', 'ngay', 'tiet_bat_dau', 'so_tiet', 'phong'],
      include: [{
        model: db.LopHocPhan,
        as: 'LopHocPhan',
        required: true,
        attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop']
      }]
    });

    const data = missedSessions.map(buoi => ({
      buoi_id: buoi.buoi_id,
      lophocphan_id: buoi.LopHocPhan?.lophocphan_id,
      ten_lop: buoi.LopHocPhan?.ten_lophocphan,
      ma_lop: buoi.LopHocPhan?.ma_lop,
      ngay_hoc: buoi.ngay,
      tiet_bat_dau: buoi.tiet_bat_dau,
      so_tiet: buoi.so_tiet,
      phong: buoi.phong
    }));

    return { success: true, data };
  } catch (error) {
    console.error('Lỗi khi lấy buổi học chưa điểm danh hôm nay:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  createStudentWarningNotification,
  getMyNotifications,
  markAsRead,
  getMissedAttendanceToday
};
