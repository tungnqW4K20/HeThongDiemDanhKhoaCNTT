require('dotenv').config({ path: './BEREquirment/.env' });
const db = require('../BEREquirment/src/models');

async function checkLHP() {
    try {
        const khoa = await db.Khoa.findOne({ where: { ten_khoa: 'Công nghệ thông tin' } });
        if (!khoa) {
            console.log('Khoa CNTT not found');
            return;
        }
        console.log('Khoa CNTT ID:', khoa.khoa_id);

        const count = await db.LopHocPhan.count({
            include: [{
                model: db.MonHoc,
                where: { khoa_id: khoa.khoa_id }
            }]
        });
        console.log('Total LHP for CNTT:', count);

        const lhp = await db.LopHocPhan.findOne({
            include: [{
                model: db.MonHoc,
                where: { khoa_id: khoa.khoa_id }
            }]
        });
        if (lhp) {
            console.log('Example LHP:', lhp.ten_lophocphan);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLHP();
