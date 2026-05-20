'use strict';

const thongBaoService = require('../services/thongbao.service');

const handleCreateStudentWarning = async (req, res) => {
  try {
    const { sinhvien_id, lophocphan_id, ti_le_vang } = req.body;
    if (!sinhvien_id || !lophocphan_id || ti_le_vang === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu sinhvien_id, lophocphan_id hoặc ti_le_vang.' });
    }

    const result = await thongBaoService.createStudentWarningNotification({ sinhvien_id, lophocphan_id, ti_le_vang });
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Lỗi controller handleCreateStudentWarning:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

const handleGetMyNotifications = async (req, res) => {
  try {
    const taikhoan_id = req.user?.taikhoan_id;
    if (!taikhoan_id) {
      return res.status(400).json({ success: false, message: 'Không xác định được tài khoản người dùng.' });
    }

    const result = await thongBaoService.getMyNotifications(taikhoan_id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi controller handleGetMyNotifications:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

const handleMarkAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const taikhoan_id = req.user?.taikhoan_id;

    if (!id || !taikhoan_id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID thông báo hoặc tài khoản người dùng.' });
    }

    const result = await thongBaoService.markAsRead(id, taikhoan_id);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Lỗi controller handleMarkAsRead:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

const handleGetMissedAttendanceToday = async (req, res) => {
  try {
    const giangvien_id = req.user?.giangvien_id;
    if (!giangvien_id) {
      return res.status(400).json({ success: false, message: 'Không xác định được giảng viên liên quan.' });
    }

    const result = await thongBaoService.getMissedAttendanceToday(giangvien_id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi controller handleGetMissedAttendanceToday:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

module.exports = {
  handleCreateStudentWarning,
  handleGetMyNotifications,
  handleMarkAsRead,
  handleGetMissedAttendanceToday
};
