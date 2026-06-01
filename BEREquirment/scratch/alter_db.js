const db = require('../src/models');
async function run() {
  try {
    console.log("Starting ALTER TABLE to add 'sinhvien' role...");
    await db.sequelize.query("ALTER TABLE taikhoan MODIFY COLUMN vaitro ENUM('admin', 'giangvien', 'lanhdao', 'truongbomon', 'sinhvien') NOT NULL");
    console.log("ALTER TABLE completed successfully!");
    
    const [results] = await db.sequelize.query("SHOW COLUMNS FROM taikhoan LIKE 'vaitro'");
    console.log("NEW COLUMN DETAILS FOR 'vaitro':", results);
  } catch (error) {
    console.error("ERROR ALTERING TABLE:", error);
  } finally {
    await db.sequelize.close();
  }
}
run();
