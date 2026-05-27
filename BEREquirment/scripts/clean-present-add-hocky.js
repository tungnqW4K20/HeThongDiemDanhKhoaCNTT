'use strict';

/**
 * Script to delete all 'present' attendance records and backfill missing 'hocky_id' in DiemDanh.
 *
 * Usage:
 *   node scripts/clean-present-add-hocky.js
 */

require('dotenv').config();
const db = require('../src/models');
const { DiemDanh, BuoiHoc, LopHocPhan, sequelize } = db;

async function main() {
  console.log('----------------------------------------------------');
  console.log('Bắt đầu dọn dẹp dữ liệu điểm danh...');
  console.log('----------------------------------------------------');

  try {
    await sequelize.authenticate();

    // 0. Đảm bảo cột hocky_id tồn tại trong bảng DiemDanh
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'DiemDanh' 
        AND COLUMN_NAME = 'hocky_id'
    `);

    if (columns.length === 0) {
      console.log('- Cột hocky_id chưa tồn tại trong bảng DiemDanh. Đang tiến hành thêm cột...');
      await sequelize.query(`
        ALTER TABLE \`DiemDanh\` 
        ADD COLUMN \`hocky_id\` CHAR(36) BINARY NULL DEFAULT NULL;
      `);
      console.log('- Đã thêm thành công cột hocky_id vào bảng DiemDanh.');
    } else {
      console.log('- Cột hocky_id đã tồn tại trong bảng DiemDanh.');
    }

    // 1. Xóa toàn bộ bản ghi 'present'
    const deletedCount = await DiemDanh.destroy({
      where: {
        trangthai: 'present'
      }
    });
    console.log(`- Đã xóa thành công ${deletedCount} bản ghi 'present' khỏi bảng DiemDanh.`);

    // 2. Tìm các bản ghi DiemDanh chưa có hocky_id
    const missingHockyRecords = await DiemDanh.findAll({
      where: {
        hocky_id: null
      }
    });

    if (missingHockyRecords.length === 0) {
      console.log('- Không tìm thấy bản ghi ngoại lệ nào thiếu hocky_id.');
      console.log('----------------------------------------------------');
      console.log('🎉 Hoàn thành dọn dẹp điểm danh thành công!');
      console.log('----------------------------------------------------');
      return;
    }

    console.log(`- Tìm thấy ${missingHockyRecords.length} bản ghi thiếu hocky_id. Bắt đầu cập nhật...`);

    // 3. Lấy thông tin mapping từ lophocphan_id sang hocky_id
    const lophocphans = await LopHocPhan.findAll({
      attributes: ['lophocphan_id', 'hocky_id']
    });
    const hockyIdByLhp = {};
    lophocphans.forEach(lhp => {
      hockyIdByLhp[lhp.lophocphan_id] = lhp.hocky_id;
    });

    // 4. Lấy thông tin mapping từ buoi_id sang lophocphan_id
    const buoiHocs = await BuoiHoc.findAll({
      attributes: ['buoi_id', 'lophocphan_id']
    });
    const lhpIdByBuoi = {};
    buoiHocs.forEach(b => {
      lhpIdByBuoi[b.buoi_id] = b.lophocphan_id;
    });

    // 5. Cập nhật hocky_id cho từng bản ghi thiếu
    let updatedCount = 0;
    const transaction = await sequelize.transaction();

    try {
      for (const record of missingHockyRecords) {
        const lhpId = lhpIdByBuoi[record.buoi_id];
        const hockyId = lhpId ? hockyIdByLhp[lhpId] : null;

        if (hockyId) {
          await record.update({ hocky_id: hockyId }, { transaction });
          updatedCount++;
        }
      }
      await transaction.commit();
      console.log(`- Đã cập nhật hocky_id cho ${updatedCount}/${missingHockyRecords.length} bản ghi ngoại lệ.`);
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Hoàn thành dọn dẹp điểm danh thành công!');
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình dọn dẹp dữ liệu:', error);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

main();
