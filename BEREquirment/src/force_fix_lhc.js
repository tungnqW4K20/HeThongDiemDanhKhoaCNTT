require('dotenv').config();
const db = require('./models');

async function forceFix() {
    try {
        const khoa = await db.Khoa.findOne({ where: { ten_khoa: 'Công nghệ thông tin' } });
        const khoa_id = khoa.khoa_id;

        const count = await db.LopHanhChinh.update(
            { khoa_id: khoa_id },
            { where: { ten_lop: ['124221', '10123O.1', '12422TN', '12523W.3', '12523W.4'] } }
        );
        console.log('Updated classes count:', count[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

forceFix();
