const db = require('../src/models');
async function run() {
  try {
    const [results] = await db.sequelize.query("SHOW COLUMNS FROM taikhoan LIKE 'vaitro'");
    console.log("COLUMNS DETAILS FOR 'vaitro':", results);
  } catch (error) {
    console.error("ERROR QUERYING DATABASE:", error);
  } finally {
    await db.sequelize.close();
  }
}
run();
