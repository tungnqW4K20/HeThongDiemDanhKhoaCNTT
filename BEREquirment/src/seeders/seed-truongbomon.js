require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');

const SALT_ROUNDS = 10;

async function run() {
  try {
    await db.sequelize.authenticate();

    const username = process.env.SEED_TBM_USERNAME || 'truongbomon';
    const password = process.env.SEED_TBM_PASSWORD || 'TruongBoMon@123';
    const boMonQuery = process.env.SEED_TBM_BOMON || 'CNPM';

    const boMon = await db.BoMon.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { ma_bomon: boMonQuery },
          { ten_bomon: boMonQuery }
        ]
      }
    });

    if (!boMon) {
      throw new Error(`Không tìm thấy bộ môn với mã hoặc tên: ${boMonQuery}`);
    }

    const lopHocPhan = await db.LopHocPhan.findOne({
      where: {
        giangvien_id: { [db.Sequelize.Op.ne]: null }
      },
      include: [{
        model: db.MonHoc,
        where: {
          [db.Sequelize.Op.or]: [
            { bomon_id: boMon.bomon_id },
            { chuyennganh_id: boMon.bomon_id }
          ]
        },
        required: true,
        attributes: []
      }],
      order: [['ngay_tao', 'DESC']]
    });

    const truongBoMonId = lopHocPhan?.giangvien_id;

    if (!truongBoMonId) {
      throw new Error('Không tìm thấy giảng viên đang dạy học phần thuộc bộ môn này để gán tài khoản.');
    }

    const existing = await db.TaiKhoan.findOne({ where: { username } });
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    let truongBoMonAccount = null;

    if (existing) {
      await existing.update({
        password_hash,
        vaitro: 'truongbomon',
        ref_id: truongBoMonId
      });
      truongBoMonAccount = existing;
      console.log('Đã cập nhật tài khoản trưởng bộ môn hiện có.');
    } else {
      truongBoMonAccount = await db.TaiKhoan.create({
        username,
        password_hash,
        vaitro: 'truongbomon',
        ref_id: truongBoMonId,
        ngay_tao: new Date()
      });
      console.log('Đã tạo tài khoản trưởng bộ môn mới.');
    }

    if (!boMon.truong_bomon_id || boMon.truong_bomon_id !== truongBoMonAccount.taikhoan_id) {
      await boMon.update({ truong_bomon_id: truongBoMonAccount.taikhoan_id });
    }

    console.log('=== Seed trưởng bộ môn thành công ===');
    console.log(`Username   : ${username}`);
    console.log(`Password   : ${password}`);
    console.log(`Bộ môn     : ${boMon.ten_bomon} (${boMon.ma_bomon})`);
    console.log(`Khoa ID    : ${boMon.khoa_id}`);
    console.log(`Ref GV ID  : ${truongBoMonId}`);
    console.log(`Ref User ID: ${truongBoMonAccount.taikhoan_id}`);
    console.log('=====================================');
  } catch (error) {
    console.error('Seed trưởng bộ môn thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
