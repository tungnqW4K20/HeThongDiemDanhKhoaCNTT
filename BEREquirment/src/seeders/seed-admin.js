require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');

const SALT_ROUNDS = 10;

async function upsertAdminAccount() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const vaitro = process.env.SEED_ADMIN_ROLE || 'admin';

  if (!['admin', 'lanhdao'].includes(vaitro)) {
    throw new Error("SEED_ADMIN_ROLE must be 'admin' or 'lanhdao'.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await db.TaiKhoan.findOne({ where: { username } });

  if (existing) {
    await existing.update({
      password_hash: passwordHash,
      vaitro,
      ref_id: null,
      ngay_tao: existing.ngay_tao || new Date()
    });

    return { username, password, vaitro, action: 'updated' };
  }

  await db.TaiKhoan.create({
    username,
    password_hash: passwordHash,
    vaitro,
    ref_id: null,
    ngay_tao: new Date()
  });

  return { username, password, vaitro, action: 'created' };
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });

    const result = await upsertAdminAccount();

    console.log('\n=== Seed admin completed ===');
    console.log(`Action   : ${result.action}`);
    console.log(`Username : ${result.username}`);
    console.log(`Password : ${result.password}`);
    console.log(`Role     : ${result.vaitro}`);
    console.log('============================\n');
  } catch (error) {
    console.error('Seed admin failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
