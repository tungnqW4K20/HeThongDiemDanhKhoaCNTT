const db = require('../src/models');

async function checkSemesters() {
  try {
    const semesters = await db.HocKy.findAll();
    console.log("Semesters:");
    semesters.forEach(s => {
      console.log(`- ID: ${s.hocky_id}, Name: ${s.ten_hocky}, Start: ${s.ngay_batdau}, End: ${s.ngay_ketthuc}, MondayT1: ${s.ngay_monday_tuan_1}`);
    });
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await db.sequelize.close();
  }
}

checkSemesters();
