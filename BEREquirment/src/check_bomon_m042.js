require('dotenv').config();
const db = require('./models');

async function checkBoMon() {
    try {
        const mon = await db.MonHoc.findOne({
            where: { ma_mon: 'M042' },
            include: [{ model: db.BoMon, as: 'BoMon' }]
        });
        if (mon) {
            console.log('MonHoc:', mon.ten_mon);
            console.log('BoMon:', mon.BoMon ? mon.BoMon.ten_bomon : 'NULL');
            console.log('BoMon Faculty ID:', mon.BoMon ? mon.BoMon.khoa_id : 'NULL');
        } else {
            console.log('MonHoc M042 not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkBoMon();
