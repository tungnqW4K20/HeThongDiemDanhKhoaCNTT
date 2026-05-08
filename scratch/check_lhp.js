require('dotenv').config({ path: './BEREquirment/.env' });
const db = require('../BEREquirment/src/models');

async function check() {
  try {
    const user = await db.TaiKhoan.findOne({
      where: { username: 'thangcv4' },
      include: [
        { model: db.Khoa, as: 'KhoaQuanLy' },
        { model: db.GiangVien, as: 'GiangVien' }
      ]
    });

    console.log('User:', JSON.stringify({
      username: user.username,
      vaitro: user.vaitro,
      taikhoan_id: user.taikhoan_id,
      khoa_quan_ly: user.KhoaQuanLy?.ten_khoa,
      khoa_quan_ly_id: user.KhoaQuanLy?.khoa_id,
      gv_khoa_id: user.GiangVien?.khoa_id
    }, null, 2));

    if (user.KhoaQuanLy) {
      const monHocs = await db.MonHoc.findAll({
        where: { khoa_id: user.KhoaQuanLy.khoa_id },
        attributes: ['monhoc_id', 'ten_mon']
      });
      console.log(`Faculty ${user.KhoaQuanLy.ten_khoa} has ${monHocs.length} subjects.`);

      const lhpCount = await db.LopHocPhan.count({
        include: [{
          model: db.MonHoc,
          where: { khoa_id: user.KhoaQuanLy.khoa_id },
          required: true
        }]
      });
      console.log(`Faculty ${user.KhoaQuanLy.ten_khoa} has ${lhpCount} part classes.`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
