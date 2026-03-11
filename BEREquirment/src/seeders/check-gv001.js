require('dotenv').config();
const { sequelize } = require('../models');

async function checkGV001Classes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Get all classes taught by GV001 in HK2
    const [classes] = await sequelize.query(`
      SELECT 
        lhp.ma_lop,
        mh.ten_mon,
        lhp.thu,
        lhp.tiet_bat_dau,
        lhp.so_tiet,
        lhp.phong,
        hk.ten_hocky,
        COUNT(bh.buoi_id) as so_buoi_hoc
      FROM LopHocPhan lhp
      JOIN GiangVien gv ON lhp.giangvien_id = gv.giangvien_id
      JOIN MonHoc mh ON lhp.monhoc_id = mh.monhoc_id
      JOIN HocKy hk ON lhp.hocky_id = hk.hocky_id
      LEFT JOIN BuoiHoc bh ON lhp.lophocphan_id = bh.lophocphan_id
      WHERE gv.ma_gv = 'GV001'
      GROUP BY lhp.lophocphan_id
      ORDER BY hk.ngay_batdau DESC, lhp.thu, lhp.tiet_bat_dau
    `);

    console.log(`📚 Lớp học phần của GV001 (Nguyễn Văn An):\n`);
    
    if (classes.length === 0) {
      console.log('   ❌ KHÔNG CÓ LỚP NÀO!\n');
    } else {
      classes.forEach(c => {
        const thu = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][c.thu || 0];
        console.log(`   ✅ ${c.ma_lop} | ${c.ten_mon}`);
        console.log(`      ${c.ten_hocky}`);
        console.log(`      ${thu}, Tiết ${c.tiet_bat_dau}-${c.tiet_bat_dau + c.so_tiet - 1}, ${c.phong}`);
        console.log(`      Số buổi học: ${c.so_buoi_hoc}`);
        console.log('');
      });
    }

    // Check HK2 specifically
    const [hk2Classes] = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM LopHocPhan lhp
      JOIN GiangVien gv ON lhp.giangvien_id = gv.giangvien_id
      JOIN HocKy hk ON lhp.hocky_id = hk.hocky_id
      WHERE gv.ma_gv = 'GV001' AND hk.ten_hocky = 'Học kỳ 2 (2025-2026)'
    `);

    console.log(`📊 Tổng số lớp GV001 dạy trong HK2: ${hk2Classes[0].total}`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkGV001Classes();
