const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/models');

async function test() {
  try {
    const [res] = await db.sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_SCHEMA = 'tot_nghiep' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log("DANH SÁCH FOREIGN KEYS TRÊN DATABASE 'tot_nghiep':");
    console.log(JSON.stringify(res, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
test();
