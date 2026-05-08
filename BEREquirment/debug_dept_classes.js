const db = require('./src/models');
const { Op } = require('sequelize');

async function checkDepartmentClasses() {
    try {
        const bomon_id = '3b110f90-c8ef-4f8b-9f2d-55c1ac6b2002';
        const hocky_id = '33cb5f46-94e9-4f2f-a398-2f7f6fbc9af3';

        const classesByMonHoc = await db.LopHocPhan.findAll({
            where: { hocky_id },
            include: [{
                model: db.MonHoc,
                where: { bomon_id },
                required: true
            }]
        });

        console.log('Classes by MonHoc.bomon_id:', classesByMonHoc.length);

        const classesByMonHocChuyenNganh = await db.LopHocPhan.findAll({
            where: { hocky_id },
            include: [{
                model: db.MonHoc,
                where: { chuyennganh_id: bomon_id },
                required: true
            }]
        });

        console.log('Classes by MonHoc.chuyennganh_id:', classesByMonHocChuyenNganh.length);

        const classesByLHC = await db.LopHocPhan.findAll({
            where: { hocky_id },
            include: [{
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                where: { chuyennganh_id: bomon_id },
                required: true
            }]
        });

        console.log('Classes by DanhSachLopHanhChinh.chuyennganh_id:', classesByLHC.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkDepartmentClasses();
