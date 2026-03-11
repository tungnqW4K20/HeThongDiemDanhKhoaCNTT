require('dotenv').config();
const { sequelize } = require('../models');

async function checkBuoiHoc() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Check số lượng buổi học theo lớp và ngày
    const [result] = await sequelize.query(`
      SELECT 
        lhp.ma_lop,
        gv.ma_gv,
        CONCAT(gv.ho, ' ', gv.ten) as gv_name,
        DATE_FORMAT(bh.ngay, '%d/%m/%Y') as ngay,
        COUNT(*) as so_luong
      FROM BuoiHoc bh
      JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
      JOIN GiangVien gv ON lhp.giangvien_id = gv.giangvien_id
      JOIN HocKy hk ON lhp.hocky_id = hk.hocky_id
      WHERE hk.ten_hocky = 'Học kỳ 2 (2025-2026)'
      GROUP BY lhp.ma_lop, bh.ngay
      HAVING COUNT(*) > 1
      ORDER BY lhp.ma_lop, bh.ngay
    `);

    console.log('📊 Buổi học DUPLICATE (cùng lớp, cùng ngày):\n');
    if (result.length === 0) {
      console.log('   ✅ Không có duplicate\n');
    } else {
      result.forEach(row => {
        console.log(`   ❌ ${row.ma_lop} | ${row.ngay} | ${row.gv_ma} ${row.gv_name} | Số lượng: ${row.so_luong}`);
      });
      console.log('');
    }

    console.log('\n📌 Tổng số buổi học:');
    const [total] = await sequelize.query(`
      SELECT COUNT(*) as total FROM BuoiHoc bh
      JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
      JOIN HocKy hk ON lhp.hocky_id = hk.hocky_id
      WHERE hk.ten_hocky = 'Học kỳ 2 (2025-2026)'
    `);
    console.log(`   ${total[0].total} buổi học\n`);

    // Check giáo viên của từng lớp
    console.log('👨‍🏫 Giáo viên phụ trách lớp HK2:\n');
    const [teachers] = await sequelize.query(`
      SELECT 
        lhp.ma_lop,
        gv.ma_gv,
        gv.ho,
        gv.ten as gv_ten
      FROM LopHocPhan lhp
      JOIN GiangVien gv ON lhp.giangvien_id = gv.giangvien_id
      JOIN HocKy hk ON lhp.hocky_id = hk.hocky_id
      WHERE hk.ten_hocky = 'Học kỳ 2 (2025-2026)'
      ORDER BY lhp.ma_lop
    `);
    
    teachers.forEach(t => {
      console.log(`   ${t.ma_lop} | ${t.ma_gv} ${t.ho} ${t.gv_ten}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkBuoiHoc();
