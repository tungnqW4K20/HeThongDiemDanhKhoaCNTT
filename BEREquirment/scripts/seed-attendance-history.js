'use strict';

/**
 * Script to seed realistic attendance history for past class sessions (BuoiHoc).
 * 
 * Logic:
 * - Identifies all past sessions (date < today, 2026-05-24).
 * - 85% of them are marked as 'completed' (attendance taken).
 * - 15% of them are left as 'scheduled' (forgotten/missed attendance).
 * - For completed sessions, creates DiemDanh records for all registered students.
 * - Student attendance status distribution:
 *   - 88% Present (Đầy đủ)
 *   - 5% Late (Muộn)
 *   - 4% Absent (Vắng không phép)
 *   - 3% Excused (Vắng có phép)
 * - Generates realistic timestamps for check-in times.
 * 
 * Usage:
 *   node scripts/seed-attendance-history.js
 */

require('dotenv').config();
const db = require('../src/models');
const { BuoiHoc, DiemDanh, DangKyHoc, sequelize } = db;

const TODAY_STR = '2026-05-24';

const TIET_START_TIMES = {
  1: { hour: 7, minute: 0 },
  2: { hour: 7, minute: 50 },
  3: { hour: 9, minute: 0 },
  4: { hour: 9, minute: 50 },
  5: { hour: 10, minute: 40 },
  6: { hour: 12, minute: 30 },
  7: { hour: 13, minute: 20 },
  8: { hour: 14, minute: 10 },
  9: { hour: 15, minute: 0 },
  10: { hour: 15, minute: 50 },
  11: { hour: 16, minute: 40 },
  12: { hour: 17, minute: 30 }
};

// Helper to parse date string safe
function parseDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function main() {
  console.log('----------------------------------------------------');
  console.log('Bắt đầu sinh lịch sử điểm danh ngẫu nhiên...');
  console.log('----------------------------------------------------');

  try {
    await sequelize.authenticate();

    // 1. Lấy toàn bộ buổi học trong quá khứ (trước ngày 2026-05-24)
    const pastSessions = await BuoiHoc.findAll({
      where: {
        ngay: {
          [db.Sequelize.Op.lt]: TODAY_STR
        }
      },
      order: [['ngay', 'ASC']]
    });

    if (pastSessions.length === 0) {
      console.log('⚠️ Không tìm thấy buổi học nào trong quá khứ để sinh điểm danh.');
      return;
    }

    console.log(`- Tìm thấy ${pastSessions.length} buổi học trong quá khứ.`);

    // 2. Lấy danh sách sinh viên đăng ký của từng lớp học phần
    const allRegistrations = await DangKyHoc.findAll({
      where: { trangthai: 'active' }
    });

    const registrationsByLhp = {};
    allRegistrations.forEach(reg => {
      if (!registrationsByLhp[reg.lophocphan_id]) {
        registrationsByLhp[reg.lophocphan_id] = [];
      }
      registrationsByLhp[reg.lophocphan_id].push(reg.sinhvien_id);
    });

    // 3. Tiến hành phân bổ và sinh dữ liệu
    let completedCount = 0;
    let missedCount = 0;
    let totalDiemDanhRecords = 0;

    const transaction = await sequelize.transaction();

    try {
      // Trước tiên, xóa điểm danh cũ của các buổi trong quá khứ để tránh trùng lặp
      const pastBuoiIds = pastSessions.map(b => b.buoi_id);
      await DiemDanh.destroy({
        where: {
          buoi_id: { [db.Sequelize.Op.in]: pastBuoiIds }
        },
        transaction
      });

      const diemDanhToCreate = [];

      for (const buoi of pastSessions) {
        // Tỷ lệ: 85% điểm danh đúng, 15% quên điểm danh
        const isCompleted = Math.random() < 0.85;

        if (isCompleted) {
          completedCount++;
          const studentIds = registrationsByLhp[buoi.lophocphan_id] || [];

          if (studentIds.length === 0) {
            // Không có học sinh nào đăng ký lớp này
            await buoi.update({
              trangthai: 'scheduled',
              batdau: null,
              nguoi_tao: null
            }, { transaction });
            continue;
          }

          // Cập nhật trạng thái buổi học thành đã điểm danh
          const tietInfo = TIET_START_TIMES[buoi.tiet_bat_dau || 1] || { hour: 7, minute: 0 };
          const sessionDate = parseDateOnly(buoi.ngay);
          
          // Thời gian bắt đầu buổi học thực tế (khoảng thời gian GV mở điểm danh)
          const startDateTime = new Date(sessionDate);
          startDateTime.setHours(tietInfo.hour, tietInfo.minute - 5, 0, 0); // GV mở trước 5p

          await buoi.update({
            trangthai: 'completed',
            batdau: startDateTime,
            // Giả sử admin hoặc giảng viên bất kỳ tạo
            nguoi_tao: buoi.nguoi_tao || null
          }, { transaction });

          // Sinh dữ liệu điểm danh cho từng sinh viên
          for (const sinhvien_id of studentIds) {
            const rand = Math.random();
            let status = 'present';
            let checkInOffsetMinutes = 0;

            if (rand < 0.88) {
              status = 'present';
              // Điểm danh đúng giờ: trong khoảng -5 phút đến +15 phút từ lúc bắt đầu tiết học
              checkInOffsetMinutes = Math.floor(-5 + Math.random() * 20);
            } else if (rand < 0.93) {
              status = 'late';
              // Đi muộn: trong khoảng +16 phút đến +45 phút
              checkInOffsetMinutes = Math.floor(16 + Math.random() * 30);
            } else if (rand < 0.97) {
              status = 'absent'; // Vắng không phép
            } else {
              status = 'excused'; // Vắng có phép
            }

            // Tính mốc check-in
            const checkInTime = new Date(sessionDate);
            checkInTime.setHours(tietInfo.hour, tietInfo.minute + checkInOffsetMinutes, 0, 0);

            diemDanhToCreate.push({
              buoi_id: buoi.buoi_id,
              sinhvien_id,
              trangthai: status,
              ghichu: status === 'excused' ? 'Xin phép nghỉ ốm' : (status === 'late' ? 'Muộn xe bus' : ''),
              thoigian_danhdau: (status === 'present' || status === 'late') ? checkInTime : startDateTime
            });
          }

        } else {
          missedCount++;
          // Buổi học bị quên điểm danh: giữ nguyên trạng thái 'scheduled'
          await buoi.update({
            trangthai: 'scheduled',
            batdau: null,
            nguoi_tao: null
          }, { transaction });
        }
      }

      // Bulk create dữ liệu điểm danh
      if (diemDanhToCreate.length > 0) {
        await DiemDanh.bulkCreate(diemDanhToCreate, { transaction });
        totalDiemDanhRecords = diemDanhToCreate.length;
      }

      await transaction.commit();
      console.log('----------------------------------------------------');
      console.log('🎉 Sinh dữ liệu lịch sử điểm danh hoàn tất!');
      console.log(`- Tổng số buổi học quá khứ: ${pastSessions.length}`);
      console.log(`- Đã điểm danh (completed) : ${completedCount} buổi.`);
      console.log(`- Quên điểm danh (missed)  : ${missedCount} buổi.`);
      console.log(`- Tạo mới bản ghi điểm danh: ${totalDiemDanhRecords} bản ghi.`);
      console.log('----------------------------------------------------');

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình sinh lịch sử điểm danh:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
