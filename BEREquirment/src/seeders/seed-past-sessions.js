/**
 * SEED PAST SESSIONS FOR REOPEN PROPOSALS
 * Tạo các buổi học đã qua (trong quá khứ) để test chức năng đề xuất mở lại
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('../models');

async function seedPastSessions() {
  try {
    console.log('🔄 Đang seed các buổi học đã qua để test mở lại...');

    const { LopHocPhan, MonHoc, GiangVien, BuoiHoc, HocKy } = db;

    // Lấy học kỳ 2 (2025-2026) - đang diễn ra hiện tại (tháng 3/2026)
    const hocKy = await HocKy.findOne({
      where: { ten_hocky: 'Học kỳ 2 (2025-2026)' }
    });

    if (!hocKy) {
      console.log('❌ Không tìm thấy Học kỳ 2 (2025-2026). Hãy chạy seed-data.js trước.');
      return;
    }

    console.log(`   ✔ Học kỳ: ${hocKy.ten_hocky}`);
    console.log(`   ✔ Ngày bắt đầu tuần 1: ${hocKy.ngay_monday_tuan_1}`);

    // Lấy danh sách lớp học phần trong kỳ này
    const lopHocPhans = await LopHocPhan.findAll({
      where: { hocky_id: hocKy.hocky_id },
      include: [
        { model: MonHoc },
        { model: GiangVien }
      ],
      limit: 5 // Lấy 5 lớp đầu tiên để test
    });

    if (lopHocPhans.length === 0) {
      console.log('❌ Không tìm thấy lớp học phần nào. Hãy chạy seed-data.js trước.');
      return;
    }

    console.log(`   ✔ Tìm thấy ${lopHocPhans.length} lớp học phần`);

    const today = new Date('2026-03-11');
    const pastSessions = [];

    // Tính tuần hiện tại trong học kỳ
    const mondayWeek1 = new Date(hocKy.ngay_monday_tuan_1);
    const diffDays = Math.floor((today - mondayWeek1) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7) + 1;
    console.log(`   ✔ Tuần hiện tại: ${currentWeek}`);

    // Tạo các buổi học đã qua cho mỗi lớp
    for (const lhp of lopHocPhans) {
      const { lophocphan_id, MonHoc: monHoc, GiangVien: giangVien, ten_lophocphan, thu, tuan_hoc } = lhp;
      
      console.log(`\n   🔍 Lớp: ${ten_lophocphan} - Thứ ${thu}`);
      
      const tuanHocArray = Array.isArray(tuan_hoc) ? tuan_hoc : [1,2,3,4,5,6,7,8,9,10];
      
      // Lấy các tuần gần đây: tuần 5,6,7 (đã qua) và tuần 8,9,10 (hiện tại + sắp tới)
      const weeksToCreate = tuanHocArray.filter(w => w >= currentWeek - 3 && w <= currentWeek + 2);
      console.log(`      → Tạo buổi cho các tuần: ${weeksToCreate.join(', ')}`);
      
      for (const weekNum of weeksToCreate) {
        // Tính ngày của tuần đó
        const mondayWeek1 = new Date(hocKy.ngay_monday_tuan_1);
        const mondayOfWeek = new Date(mondayWeek1);
        mondayOfWeek.setDate(mondayOfWeek.getDate() + (weekNum - 1) * 7);
        
        // Tính ngày của buổi học dựa vào thứ
        const sessionDate = new Date(mondayOfWeek);
        const daysToAdd = thu === 8 ? 6 : (thu - 2); 
        sessionDate.setDate(sessionDate.getDate() + daysToAdd);
        
        const dateStr = sessionDate.toISOString().split('T')[0];
        
        // Tạo cho cả buổi đã qua và sắp tới (trong phạm vi 6 tuần)
        pastSessions.push({
          buoi_id: require('crypto').randomUUID(),
          lophocphan_id: lophocphan_id,
          ngay: dateStr,
          trangthai: 'scheduled',
          is_override: false,
          created_at: new Date(),
          updated_at: new Date()
        });

        const isPast = sessionDate < today;
        const icon = isPast ? '📅' : '📆';
        console.log(`      ${icon} ${ten_lophocphan} - ${giangVien.ten} - ${dateStr} - Tuần ${weekNum} ${isPast ? '(đã qua)' : '(sắp tới)'}`);
      }
    }

    // Bulk insert
    if (pastSessions.length > 0) {
      await BuoiHoc.bulkCreate(pastSessions, { ignoreDuplicates: true });
      console.log(`\n✅ Đã tạo ${pastSessions.length} buổi học đã qua để test mở lại!`);
    } else {
      console.log('\n⚠️  Không tạo được buổi học nào');
    }

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

if (require.main === module) {
  seedPastSessions()
    .then(() => {
      console.log('✅ Hoàn thành!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seedPastSessions };
