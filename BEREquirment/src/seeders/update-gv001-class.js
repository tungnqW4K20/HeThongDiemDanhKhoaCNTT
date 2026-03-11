require('dotenv').config();
const { sequelize, GiangVien, LopHocPhan } = require('../models');

async function updateGV001Class() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.');

    // Tìm giảng viên GV001
    const gv001 = await GiangVien.findOne({ where: { ma_gv: 'GV001' } });
    if (!gv001) {
      console.log('❌ Không tìm thấy GV001');
      return;
    }

    // Cập nhật giáo viên cho lớp 26S1W.1
    const [updated] = await LopHocPhan.update(
      { giangvien_id: gv001.id },
      { where: { ma_lop: '26S1W.1' } }
    );

    console.log(`✅ Đã cập nhật ${updated} lớp học phần`);
    console.log(`   26S1W.1 → GV001 (${gv001.ho} ${gv001.ten})`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

updateGV001Class();
