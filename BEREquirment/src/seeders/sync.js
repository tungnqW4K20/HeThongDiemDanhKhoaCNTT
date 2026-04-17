require('dotenv').config();
const path = require('path');
const { spawnSync } = require('child_process');
const db = require('../models');

async function run() {
  try {
    await db.sequelize.authenticate();

    await db.sequelize.sync({ alter: true });
    console.log('Sequelize sync completed.');

    // Close current sequelize pool before launching the dedicated migration script.
    await db.sequelize.close();

    const scriptPath = path.join(__dirname, 'sync-bomon-schema.js');
    const result = spawnSync(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env
    });

    if (result.status !== 0) {
      throw new Error(`sync-bomon-schema failed with exit code ${result.status}`);
    }

    console.log('=== Sync all schema completed successfully ===');
  } catch (error) {
    console.error('Sync all schema failed:', error.message);
    process.exitCode = 1;
  }
}

run();
