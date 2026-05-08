require('dotenv').config({ path: './BEREquirment/.env' });
const db = require('./models');

async function checkMonHoc() {
    try {
        const khoa = await db.Khoa.findOne({ where: { ten_khoa: 'Công nghệ thông tin' } });
        if (!khoa) {
            console.log('Khoa CNTT not found');
            return;
        }
        console.log('Khoa CNTT ID:', khoa.khoa_id);

        const subjects = await db.MonHoc.findAll({
            where: { khoa_id: khoa.khoa_id },
            limit: 5
        });
        console.log('CNTT Subjects count:', subjects.length);
        subjects.forEach(s => console.log(' -', s.ten_mon));

        const lhp = await db.LopHocPhan.count({
            include: [{
                model: db.MonHoc,
                where: { khoa_id: khoa.khoa_id }
            }]
        });
        console.log('LHP with CNTT subjects:', lhp);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkMonHoc();
