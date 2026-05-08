const db = require('./models');

async function checkUser() {
    try {
        const user = await db.TaiKhoan.findOne({
            where: { username: 'thangcv4' },
            include: [
                { model: db.Khoa, as: 'KhoaQuanLy' }
            ]
        });

        if (user) {
            console.log('User found:', user.tendangnhap);
            console.log('Role:', user.vaitro);
            console.log('KhoaQuanLy:', user.KhoaQuanLy ? user.KhoaQuanLy.ten_khoa : 'NULL');
            console.log('Khoa ID:', user.KhoaQuanLy ? user.KhoaQuanLy.khoa_id : 'NULL');
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkUser();
