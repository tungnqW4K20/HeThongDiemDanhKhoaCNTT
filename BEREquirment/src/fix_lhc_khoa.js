require('dotenv').config();
const db = require('./models');

async function fixLHC() {
    try {
        const khoa = await db.Khoa.findOne({ where: { ten_khoa: 'Công nghệ thông tin' } });
        const khoa_id = khoa.khoa_id;

        // Tìm các lớp hành chính đang có khoa_id = null nhưng tham gia lớp học phần của khoa CNTT
        const lhcs = await db.LopHanhChinh.findAll({
            where: { khoa_id: null },
            include: [{
                model: db.LopHocPhan,
                as: 'DanhSachLopHocPhan',
                include: [{
                    model: db.MonHoc,
                    where: { 
                        [db.Sequelize.Op.or]: [
                            { khoa_id: khoa_id },
                            { '$MonHoc.BoMon.khoa_id$': khoa_id }
                        ]
                    },
                    include: [{ model: db.BoMon, as: 'BoMon' }]
                }]
            }]
        });

        console.log('Found LHCs to fix:', lhcs.length);
        for (const lhc of lhcs) {
            console.log(`Fixing LHC: ${lhc.ten_lop}`);
            await lhc.update({ khoa_id: khoa_id });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

fixLHC();
