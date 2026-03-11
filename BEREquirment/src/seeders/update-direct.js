require('dotenv').config();
const { sequelize } = require('../models');

async function updateDirectly() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Lấy giangvien_id của GV001
    const [gv001Result] = await sequelize.query(
      "SELECT giangvien_id FROM GiangVien WHERE ma_gv = 'GV001'"
    );
    
    if (!gv001Result || gv001Result.length === 0) {
      console.log('❌ Không tìm thấy GV001');
      return;
    }

    const gv001Id = gv001Result[0].giangvien_id;
    console.log(`📌 GV001 ID: ${gv001Id}\n`);

    // Update lớp 26S1W.1
    const [result] = await sequelize.query(
      `UPDATE LopHocPhan SET giangvien_id = '${gv001Id}' WHERE ma_lop = '26S1W.1'`
    );

    console.log('✅ Đã cập nhật thành công!');
    console.log(`   26S1W.1 → GV001\n`);

    // Verify
    const [verify] = await sequelize.query(
      `SELECT lhp.ma_lop, lhp.ten, gv.ma_gv, gv.ho, gv.ten as gv_ten
       FROM LopHocPhan lhp
       JOIN GiangVien gv ON lhp.giangvien_id = gv.id
       WHERE lhp.ma_lop = '26S1W.1'`
    );

    console.log('📝 Kiểm tra lại:');
    verify.forEach(row => {
      console.log(`   ${row.ma_lop} | ${row.ten} | GV: ${row.ma_gv} ${row.ho} ${row.gv_ten}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

updateDirectly();
