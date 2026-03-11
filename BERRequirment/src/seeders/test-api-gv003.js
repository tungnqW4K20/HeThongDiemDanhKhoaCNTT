require('dotenv').config();
const { sequelize } = require('../models');

async function testAPIGV003() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Get GV003's ID
    const [gvResult] = await sequelize.query(`
      SELECT giangvien_id, ma_gv, ho, ten FROM GiangVien WHERE ma_gv = 'GV003'
    `);
    
    if (!gvResult.length) {
      console.log('❌ Không tìm thấy GV003');
      return;
    }

    const gv003 = gvResult[0];
    console.log(`👤 Giảng viên: ${gv003.ma_gv} - ${gv003.ho} ${gv003.ten}`);
    console.log(`   ID: ${gv003.giangvien_id}\n`);

    // Get HK2
    const [hkResult] = await sequelize.query(`
      SELECT hocky_id, ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1
      FROM HocKy WHERE ten_hocky = 'Học kỳ 2 (2025-2026)'
    `);

    const hk2 = hkResult[0];
    console.log(`📅 Học kỳ: ${hk2.ten_hocky}`);
    console.log(`   ID: ${hk2.hocky_id}`);
    console.log(`   ⭐ ngay_batdau: ${hk2.ngay_batdau}`);
    console.log(`   ⭐ ngay_ketthuc: ${hk2.ngay_ketthuc}`);
    console.log(`   ⭐ ngay_monday_tuan_1: ${hk2.ngay_monday_tuan_1}\n`);

    // Get schedule count
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM BuoiHoc bh
      JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
      WHERE lhp.giangvien_id = '${gv003.giangvien_id}'
        AND lhp.hocky_id = '${hk2.hocky_id}'
    `);

    console.log(`📊 Số buổi học của GV003 trong HK2: ${countResult[0].total}\n`);

    // Simulate what API returns
    console.log('📡 Dữ liệu API sẽ trả về (res.hocKy):\n');
    console.log('   {');
    console.log(`     hocky_id: '${hk2.hocky_id}',`);
    console.log(`     ten_hocky: '${hk2.ten_hocky}',`);
    console.log(`     ngay_batdau: '${hk2.ngay_batdau}',`);
    console.log(`     ngay_ketthuc: '${hk2.ngay_ketthuc}',`);
    console.log(`     ngay_monday_tuan_1: '${hk2.ngay_monday_tuan_1}'`);
    console.log('   }\n');

    // Calculate what week we should be in
    const monday1 = new Date(hk2.ngay_monday_tuan_1);
    const now = new Date('2026-03-11'); // Today
    const diffDays = Math.floor((now - monday1) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    console.log(`🗓️  Tính toán tuần:\n`);
    console.log(`   Monday tuần 1: ${monday1.toISOString().split('T')[0]}`);
    console.log(`   Hôm nay: ${now.toISOString().split('T')[0]}`);
    console.log(`   Số ngày chênh lệch: ${diffDays}`);
    console.log(`   ➡️  Tuần hiện tại: TUẦN ${weekNumber}\n`);

    // Sample schedule data
    const [schedule] = await sequelize.query(`
      SELECT 
        bh.ngay,
        mh.ten_mon,
        bh.tiet_bat_dau,
        bh.so_tiet
      FROM BuoiHoc bh
      JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
      JOIN MonHoc mh ON lhp.monhoc_id = mh.monhoc_id
      WHERE lhp.giangvien_id = '${gv003.giangvien_id}'
        AND lhp.hocky_id = '${hk2.hocky_id}'
      ORDER BY bh.ngay
      LIMIT 5
    `);

    console.log('📝 Mẫu 5 buổi học đầu tiên:\n');
    schedule.forEach((s, idx) => {
      const buoiDate = new Date(s.ngay);
      const buoiDiff = Math.floor((buoiDate - monday1) / (1000 * 60 * 60 * 24));
      const buoiWeek = Math.floor(buoiDiff / 7) + 1;
      console.log(`   ${idx + 1}. ${s.ngay} (Tuần ${buoiWeek}) - ${s.ten_mon}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

testAPIGV003();
