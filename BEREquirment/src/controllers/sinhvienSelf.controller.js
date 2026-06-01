'use strict';
const svSelfService = require('../services/sinhvienSelf.service');

const getMySchedule = async (req, res) => {
  try {
    const sinhvien_id = req.user.sinhvien_id;
    if (!sinhvien_id) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không được liên kết với hồ sơ sinh viên hợp lệ.'
      });
    }

    const { hocky_id } = req.query;
    const schedule = await svSelfService.getStudentSchedule(sinhvien_id, hocky_id);

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch học sinh viên thành công.',
      data: schedule
    });
  } catch (error) {
    console.error('Controller Error - getMySchedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch học sinh viên: ' + error.message
    });
  }
};

const getMyAttendanceHistory = async (req, res) => {
  try {
    const sinhvien_id = req.user.sinhvien_id;
    if (!sinhvien_id) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không được liên kết với hồ sơ sinh viên hợp lệ.'
      });
    }

    const { hocky_id } = req.query;
    const history = await svSelfService.getStudentAttendanceHistory(sinhvien_id, hocky_id);

    return res.status(200).json({
      success: true,
      message: 'Lấy quá trình điểm danh thành công.',
      data: history
    });
  } catch (error) {
    console.error('Controller Error - getMyAttendanceHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy quá trình điểm danh: ' + error.message
    });
  }
};

module.exports = {
  getMySchedule,
  getMyAttendanceHistory
};
