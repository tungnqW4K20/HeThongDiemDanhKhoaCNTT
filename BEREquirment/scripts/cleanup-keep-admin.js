'use strict';

/**
 * Cleanup script: remove all data in DB, keep only admin accounts in TaiKhoan.
 *
 * Usage:
 *   node scripts/cleanup-keep-admin.js --db=tot_nghiep --yes
 *
 * Notes:
 * - This script is destructive.
 * - It keeps table structure intact.
 * - It truncates all tables except TaiKhoan.
 * - In TaiKhoan, it deletes all rows where vaitro <> 'admin'.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const configByEnv = require('../src/config/config');

function readArg(name) {
  const exact = process.argv.find((arg) => arg === name);
  if (exact) return true;

  const prefixed = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (!prefixed) return null;

  return prefixed.slice(name.length + 1);
}

function normalizeTableName(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    if (item.tableName) return item.tableName;
    if (item.TABLE_NAME) return item.TABLE_NAME;
    const firstValue = Object.values(item)[0];
    return typeof firstValue === 'string' ? firstValue : null;
  }
  return null;
}

async function main() {
  const isConfirmed = Boolean(readArg('--yes'));
  const env = process.env.NODE_ENV || 'development';
  const envConfig = configByEnv[env];

  if (!envConfig) {
    throw new Error(`Không tìm thấy cấu hình DB cho NODE_ENV='${env}'.`);
  }

  if (!isConfirmed) {
    console.log('Script này sẽ xóa dữ liệu. Hãy chạy lại với --yes để xác nhận.');
    console.log('Ví dụ: node scripts/cleanup-keep-admin.js --db=tot_nghiep --yes');
    process.exit(1);
  }

  const dbOverride = readArg('--db');
  const finalConfig = {
    ...envConfig,
    database: typeof dbOverride === 'string' && dbOverride.trim() ? dbOverride.trim() : envConfig.database,
    logging: false
  };

  const sequelize = new Sequelize(
    finalConfig.database,
    finalConfig.username,
    finalConfig.password,
    finalConfig
  );

  try {
    await sequelize.authenticate();
    const [dbRows] = await sequelize.query('SELECT DATABASE() AS db_name;');
    const currentDb = dbRows?.[0]?.db_name || finalConfig.database;

    console.log(`Da ket noi DB: ${currentDb}`);
    console.log('Bat dau don du lieu...');

    const queryInterface = sequelize.getQueryInterface();
    const rawTables = await queryInterface.showAllTables();

    const tableNames = rawTables
      .map(normalizeTableName)
      .filter(Boolean);

    const tablesToTruncate = tableNames.filter((name) => name !== 'TaiKhoan');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    for (const table of tablesToTruncate) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    const [deleteResult] = await sequelize.query(
      "DELETE FROM `TaiKhoan` WHERE `vaitro` IS NULL OR `vaitro` <> 'admin';"
    );

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    const [countRows] = await sequelize.query(
      "SELECT COUNT(*) AS admin_count FROM `TaiKhoan` WHERE `vaitro` = 'admin';"
    );

    const removed = typeof deleteResult?.affectedRows === 'number' ? deleteResult.affectedRows : 'N/A';
    const adminCount = countRows?.[0]?.admin_count ?? 0;

    console.log('Hoan tat cleanup.');
    console.log(`Da xoa tai khoan khong phai admin: ${removed}`);
    console.log(`So tai khoan admin con lai: ${adminCount}`);
  } catch (error) {
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } catch (_) {
      // Ignore secondary errors when restoring checks.
    }
    console.error('Cleanup that bai:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
