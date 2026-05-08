require('dotenv').config();
const db = require('./models');

async function checkLHP() {
    try {
        const khoa = await db.Khoa.findOne({ where: { ten_khoa: 'Công nghệ thông tin' } });
        const lhps = await db.LopHocPhan.findAll({
            include: [
                {
                    model: db.MonHoc,
                    where: { khoa_id: khoa.khoa_id }
                },
                {
                    model: db.HocKy
                }
            ]
        });

        console.log('Total LHP for CNTT:', lhps.length);
        lhps.forEach(lhp => {
            console.log(` - ${lhp.ten_lophocphan} | Semester: ${lhp.HocKy ? lhp.HocKy.ten_hocky : 'NULL'}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkLHP();
