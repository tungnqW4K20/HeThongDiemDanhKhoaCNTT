const db = require('../src/models');
const { getAllAssignments } = require('../src/controllers/phancong.controller');

async function test() {
  try {
    const semesters = await db.HocKy.findAll();
    const hocky_id = semesters[0].hocky_id;
    console.log("Using hocky_id:", hocky_id);

    const mockReq = {
      query: {
        hocky_id,
        from_date: '2026-05-18',
        to_date: '2026-05-24'
      },
      user: {
        role: 'admin', // Bypass scope checks or matches admin
        giangvien_id: 'some-id'
      }
    };

    const mockRes = {
      status(code) {
        console.log("Res.status code:", code);
        return this;
      },
      json(data) {
        console.log("Res.json data success:", data.success);
        if (data.success) {
          console.log("Stats returned:", data.stats);
          console.log("Rows returned count:", data.data?.length);
        } else {
          console.log("Error message:", data.message);
        }
        return this;
      }
    };

    await getAllAssignments(mockReq, mockRes);
  } catch (error) {
    console.error("CONTROLLER EXECUTION ERROR:", error);
  } finally {
    await db.sequelize.close();
  }
}

test();
