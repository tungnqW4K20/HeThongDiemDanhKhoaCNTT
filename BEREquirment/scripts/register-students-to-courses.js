'use strict';

/**
 * Script to automatically enroll existing students into course classes (LopHocPhan)
 * based on their administrative class (LopHanhChinh) mapping (linked via LHP_LHC pivot table).
 * 
 * Usage:
 *   node scripts/register-students-to-courses.js
 */

require('dotenv').config();
const db = require('../src/models');
const { SinhVien, LHP_LHC, DangKyHoc, sequelize } = db;

async function main() {
  console.log('----------------------------------------------------');
  console.log('Bắt đầu đồng bộ & đăng ký sinh viên vào lớp học phần...');
  console.log('----------------------------------------------------');

  try {
    await sequelize.authenticate();

    // 1. Lấy tất cả sinh viên đang hoạt động có lớp hành chính
    const sinhViens = await SinhVien.findAll({
      where: { isDeleted: false, lop_hanhchinh_id: { [db.Sequelize.Op.ne]: null } },
      attributes: ['sinhvien_id', 'lop_hanhchinh_id', 'ma_sv', 'ten']
    });

    if (sinhViens.length === 0) {
      console.log('⚠️ Không tìm thấy sinh viên nào có lớp hành chính trong hệ thống.');
      return;
    }

    console.log(`- Tìm thấy ${sinhViens.length} sinh viên có lớp hành chính.`);

    // 2. Lấy tất cả liên kết giữa lớp học phần và lớp hành chính (LHP_LHC)
    const lhpLhcs = await LHP_LHC.findAll();
    const lhcToLhpMap = {}; // lop_hanhchinh_id => list of lophocphan_id
    lhpLhcs.forEach(link => {
      if (!lhcToLhpMap[link.lop_hanhchinh_id]) {
        lhcToLhpMap[link.lop_hanhchinh_id] = [];
      }
      lhcToLhpMap[link.lop_hanhchinh_id].push(link.lophocphan_id);
    });

    // 3. Lấy tất cả đăng ký học phần hiện có để tránh trùng lặp
    const existingRegistrations = await DangKyHoc.findAll({
      attributes: ['sinhvien_id', 'lophocphan_id']
    });
    
    const existingRegSet = new Set(
      existingRegistrations.map(r => `${r.sinhvien_id}_${r.lophocphan_id}`)
    );

    // 4. Chuẩn bị danh sách đăng ký mới
    const dangKyToCreate = [];
    
    for (const sv of sinhViens) {
      const linkedLhpIds = lhcToLhpMap[sv.lop_hanhchinh_id] || [];
      for (const lhpId of linkedLhpIds) {
        const key = `${sv.sinhvien_id}_${lhpId}`;
        if (!existingRegSet.has(key)) {
          dangKyToCreate.push({
            sinhvien_id: sv.sinhvien_id,
            lophocphan_id: lhpId,
            ngay_dangky: new Date(),
            trangthai: 'active'
          });
        }
      }
    }

    if (dangKyToCreate.length === 0) {
      console.log('✨ Tất cả sinh viên đã được đăng ký đúng học phần đầy đủ. Không cần thêm mới.');
      return;
    }

    console.log(`- Phát hiện ${dangKyToCreate.length} lượt đăng ký lớp học phần còn thiếu.`);

    // 5. Lưu vào cơ sở dữ liệu
    const transaction = await sequelize.transaction();
    try {
      const createdCount = await DangKyHoc.bulkCreate(dangKyToCreate, { transaction });
      await transaction.commit();
      
      console.log('----------------------------------------------------');
      console.log('🎉 Đồng bộ hoàn tất!');
      console.log(`- Đã đăng ký thành công thêm: ${createdCount.length} lượt học phần (DangKyHoc).`);
      console.log('----------------------------------------------------');
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình đăng ký sinh viên vào lớp học phần:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
