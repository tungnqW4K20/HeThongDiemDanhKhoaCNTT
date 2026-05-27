'use strict';

/**
 * Script to clear all students and attendance data from the database.
 * 
 * It will:
 * 1. Delete all DiemDanh (attendance) records.
 * 2. Delete all DangKyHoc (course class registrations) records.
 * 3. Delete all SinhVien (student) records.
 * 4. Delete manual BuoiHoc sessions (is_override = true) and reset standard ones to 'scheduled'.
 * 
 * Usage:
 *   node scripts/clear-students.js
 */

require('dotenv').config();
const db = require('../src/models');
const { SinhVien, DangKyHoc, DiemDanh, BuoiHoc, sequelize } = db;

async function main() {
  console.log('----------------------------------------------------');
  console.log('Bắt đầu xóa toàn bộ dữ liệu sinh viên và điểm danh...');
  console.log('----------------------------------------------------');

  const transaction = await sequelize.transaction();

  try {
    // Tắt kiểm tra khóa ngoại để thực hiện xóa nhanh và sạch
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction });

    // 1. Xóa toàn bộ điểm danh
    const diemDanhCount = await DiemDanh.destroy({ where: {}, transaction });
    console.log(`- Đã xóa ${diemDanhCount} bản ghi điểm danh (DiemDanh).`);

    // 2. Xóa toàn bộ đăng ký lớp học phần (sinh viên ra khỏi lớp học phần)
    const dangKyCount = await DangKyHoc.destroy({ where: {}, transaction });
    console.log(`- Đã xóa ${dangKyCount} bản ghi đăng ký lớp học phần (DangKyHoc).`);

    // 3. Xóa toàn bộ sinh viên khỏi hệ thống (bao gồm xóa khỏi lớp hành chính)
    const sinhVienCount = await SinhVien.destroy({ where: {}, transaction });
    console.log(`- Đã xóa ${sinhVienCount} sinh viên khỏi hệ thống (SinhVien).`);

    // 4. Xử lý buổi học (BuoiHoc)
    // - Xóa các buổi dạy bù / dạy phát sinh tự tạo (is_override = true)
    const deleteBuoiHocCount = await BuoiHoc.destroy({ where: { is_override: true }, transaction });
    console.log(`- Đã xóa ${deleteBuoiHocCount} buổi học phát sinh / dạy bù (BuoiHoc - override).`);

    // - Đưa các buổi học chính khóa về trạng thái chưa điểm danh ('scheduled')
    const [updateBuoiHocCount] = await BuoiHoc.update({
      trangthai: 'scheduled',
      nguoi_tao: null,
      batdau: null
    }, {
      where: {},
      transaction
    });
    console.log(`- Đã đặt lại trạng thái cho ${updateBuoiHocCount} buổi học chính khóa về 'scheduled' (chưa điểm danh).`);

    // Bật lại kiểm tra khóa ngoại
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction });

    await transaction.commit();
    console.log('----------------------------------------------------');
    console.log('🎉 Xóa dữ liệu thành công!');
    console.log('----------------------------------------------------');
  } catch (error) {
    if (transaction) await transaction.rollback();

    // Đảm bảo bật lại khóa ngoại kể cả khi lỗi
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } catch (_) { }

    console.error('❌ Lỗi trong quá trình xóa dữ liệu:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
