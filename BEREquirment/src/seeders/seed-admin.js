require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const db = require('../models');

const ADMIN_ACCOUNTS = [
  {
    username: 'admin',
    password: 'Admin@123',
  },
];

const SALT_ROUNDS = 10;

async function seedAdmin() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Kết nối database thành công.');

    const { TaiKhoan } = db;

    for (const acc of ADMIN_ACCOUNTS) {
      const existing = await TaiKhoan.findOne({ where: { username: acc.username } });

      if (existing) {
        console.log(`⚠️  Tài khoản "${acc.username}" đã tồn tại, bỏ qua.`);
        continue;
      }

      const password_hash = await bcrypt.hash(acc.password, SALT_ROUNDS);

      await TaiKhoan.create({
        username: acc.username,
        password_hash,
        vaitro: 'admin',
        ref_id: null,
      });

      console.log(`🆕 Đã tạo tài khoản admin: "${acc.username}" / "${acc.password}"`);
    }

    console.log('🎉 Seed admin hoàn tất.');
  } catch (err) {
    console.error('❌ Lỗi khi seed admin:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seedAdmin();
