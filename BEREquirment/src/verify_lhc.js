require('dotenv').config();
const db = require('./models');

async function checkLHC() {
    try {
        const lhcs = await db.LopHanhChinh.findAll({
            where: { ten_lop: ['124221', '10123O.1', '12422TN'] }
        });
        lhcs.forEach(lhc => {
            console.log(`LHC: ${lhc.ten_lop} | Khoa ID: ${lhc.khoa_id}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLHC();
