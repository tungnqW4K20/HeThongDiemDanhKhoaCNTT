const db = require('./BEREquirment/src/models');

async function checkUserScope() {
    try {
        const username = 'thangcv2';
        const account = await db.TaiKhoan.findOne({
            where: { username },
            attributes: ['taikhoan_id', 'username', 'vaitro', 'ref_id']
        });

        if (!account) {
            console.log('Account not found');
            return;
        }

        console.log('Account Info:', JSON.stringify(account, null, 2));

        const boMon = await db.BoMon.findOne({
            where: {
                truong_bomon_id: account.taikhoan_id,
                isDeleted: false
            },
            attributes: ['bomon_id', 'ten_bomon', 'khoa_id']
        });

        if (boMon) {
            console.log('Direct BoMon Match:', JSON.stringify(boMon, null, 2));
        } else {
            console.log('No direct BoMon match found for truong_bomon_id =', account.taikhoan_id);
            
            // Maybe check if it's assigned via GiangVien?
            const gv = await db.GiangVien.findOne({
                where: { giangvien_id: account.ref_id },
                include: [{
                    model: db.BoMon,
                    as: 'DanhSachBoMon',
                    through: { attributes: [] }
                }]
            });
            
            if (gv) {
                console.log('Lecturer Info:', JSON.stringify(gv, null, 2));
            }
        }
        
        // Check if there are ANY LopHocPhan in this semester
        const hocky = await db.HocKy.findOne({
            where: { ten_hocky: { [db.Sequelize.Op.like]: '%Học kỳ 2 - Năm học 2025-2026%' } }
        });
        
        if (hocky) {
            console.log('Semester ID:', hocky.hocky_id);
            const count = await db.LopHocPhan.count({ where: { hocky_id: hocky.hocky_id } });
            console.log('Total LopHocPhan in this semester:', count);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUserScope();
