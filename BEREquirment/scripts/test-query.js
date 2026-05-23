const db = require('../src/models');
const phanCongService = require('../src/services/phancong.service');

async function test() {
  try {
    const semesters = await db.HocKy.findAll();
    console.log("Semesters found:", semesters.map(s => s.hocky_id));
    if (semesters.length === 0) {
      console.log("No semesters in DB!");
      return;
    }
    const hocky_id = semesters[0].hocky_id;
    console.log("Using hocky_id:", hocky_id);
    const rows = await phanCongService.getAllByHocKy(
      hocky_id,
      '',
      null,
      null,
      '2026-05-18',
      '2026-05-24'
    );
    console.log("Successfully fetched rows count:", rows.length);
    if (rows.length > 0) {
      console.log("First row dataValues:", rows[0].dataValues);
    }
  } catch (error) {
    console.error("TEST QUERY ERROR:", error);
  } finally {
    await db.sequelize.close();
  }
}

test();
