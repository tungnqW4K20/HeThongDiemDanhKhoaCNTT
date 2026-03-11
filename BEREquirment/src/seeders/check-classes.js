require('dotenv').config();
const { sequelize, LopHocPhan, GiangVien, HocKy } = require('../models');

async function checkClasses() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    const classes = await LopHocPhan.findAll({
      include: [
        { model: GiangVien, attributes: ['ma_gv', 'ho', 'ten'] },
        { model: HocKy, attributes: ['ten_hocky'] }
      ],
      order: [['ma_lop', 'ASC']]
    });

    console.log(`📚 Tổng số lớp học phần: ${classes.length}\n`);

    classes.forEach(c => {
      const gv = c.GiangVien ? `${c.GiangVien.ma_gv} ${c.GiangVien.ho} ${c.GiangVien.ten}` : 'N/A';
      const hk = c.HocKy ? c.HocKy.ten_hocky : 'N/A';
      console.log(`   ${c.ma_lop} | ${c.ten} | GV: ${gv} | ${hk}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

checkClasses();
