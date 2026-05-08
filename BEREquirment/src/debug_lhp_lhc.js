require('dotenv').config();
const db = require('./models');

async function debugLHP() {
    try {
        const lhps = await db.LopHocPhan.findAll({
            where: { ten_lophocphan: { [db.Sequelize.Op.like]: '%Chuyên đề học sâu%' } },
            include: [
                {
                    model: db.LopHanhChinh,
                    as: 'DanhSachLopHanhChinh'
                },
                {
                    model: db.MonHoc,
                    include: [{ model: db.Khoa, as: 'Khoa' }]
                }
            ]
        });

        console.log('Found LHPs:', lhps.length);
        for (const lhp of lhps) {
            console.log(`LHP: ${lhp.ten_lophocphan} (${lhp.lophocphan_id})`);
            console.log(`Subject Faculty: ${lhp.MonHoc?.Khoa?.ten_khoa || 'NULL'}`);
            console.log(`Associated LHCs: ${lhp.DanhSachLopHanhChinh.length}`);
            lhp.DanhSachLopHanhChinh.forEach(lhc => {
                console.log(` - ${lhc.ten_lop} | Faculty ID: ${lhc.khoa_id}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugLHP();
