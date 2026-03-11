require('dotenv').config();
const { sequelize } = require('../models');

async function checkHocKy() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    const [result] = await sequelize.query(`
      SELECT 
        ten_hocky,
        DATE_FORMAT(ngay_batdau, '%Y-%m-%d') as ngay_batdau,
        DATE_FORMAT(ngay_ketthuc, '%Y-%m-%d') as ngay_ketthuc,
        DATE_FORMAT(ngay_monday_tuan_1, '%Y-%m-%d') as ngay_monday_tuan_1
      FROM HocKy
      WHERE ten_hocky LIKE '%2025-2026%'
      ORDER BY ngay_batdau
    `);

    console.log('📅 Học kỳ năm 2025-2026:\n');
    result.forEach(row => {
      console.log(`   ${row.ten_hocky}`);
      console.log(`   - Bắt đầu: ${row.ngay_batdau}`);
      console.log(`   - Kết thúc: ${row.ngay_ketthuc}`);
      console.log(`   - Monday tuần 1: ${row.ngay_monday_tuan_1}`);
      console.log('');
    });

    // Check current date vs HK2
    console.log('🗓️  Kiểm tra ngày hiện tại:\n');
    const now = new Date();
    const hk2 = result.find(r => r.ten_hocky === 'Học kỳ 2 (2025-2026)');
    
    if (hk2) {
      const start = new Date(hk2.ngay_batdau);
      const end = new Date(hk2.ngay_ketthuc);
      const monday1 = new Date(hk2.ngay_monday_tuan_1);
      
      console.log(`   Hôm nay: ${now.toISOString().split('T')[0]}`);
      console.log(`   Trong khoảng HK2: ${now >= start && now <= end ? 'CÓ ✅' : 'KHÔNG ❌'}`);
      console.log(`   Sau Monday tuần 1: ${now >= monday1 ? 'CÓ ✅' : 'KHÔNG ❌'}`);
      
      // Calculate which week we're in
      const diffDays = Math.floor((now.getTime() - monday1.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7) + 1;
      console.log(`   Đang ở tuần: ${weekNumber}`);
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkHocKy();
