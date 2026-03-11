require('dotenv').config();
const { sequelize } = require('../models');

async function testAPIResponse() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Get GV001's ID
    const [gvResult] = await sequelize.query(`
      SELECT giangvien_id, ma_gv, ho, ten FROM GiangVien WHERE ma_gv = 'GV001'
    `);
    
    if (!gvResult.length) {
      console.log('❌ Không tìm thấy GV001');
      return;
    }

    const gv001 = gvResult[0];
    console.log(`👤 Giảng viên: ${gv001.ma_gv} - ${gv001.ho} ${gv001.ten}`);
    console.log(`   ID: ${gv001.giangvien_id}\n`);

    // Get HK2 ID
    const [hkResult] = await sequelize.query(`
      SELECT hocky_id, ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1
      FROM HocKy WHERE ten_hocky = 'Học kỳ 2 (2025-2026)'
    `);

    if (!hkResult.length) {
      console.log('❌ Không tìm thấy HK2');
      return;
    }

    const hk2 = hkResult[0];
    console.log(`📅 Học kỳ: ${hk2.ten_hocky}`);
    console.log(`   ID: ${hk2.hocky_id}`);
    console.log(`   Ngày bắt đầu: ${hk2.ngay_batdau}`);
    console.log(`   Ngày kết thúc: ${hk2.ngay_ketthuc}`);
    console.log(`   Monday tuần 1: ${hk2.ngay_monday_tuan_1}\n`);

    // Simulate API call - get schedule for GV001 in HK2
    console.log('📊 Lịch dạy GV001 trong HK2 (giống API):\n');
    
    const [schedule] = await sequelize.query(`
      SELECT 
        bh.buoi_id,
        bh.ngay,
        bh.trangthai,
        bh.tiet_bat_dau,
        bh.so_tiet,
        bh.phong,
        lhp.lophocphan_id,
        lhp.ten_lophocphan,
        lhp.phong as lhp_phong,
        lhp.thu,
        lhp.loai_hoc_phan,
        mh.ten_mon,
        mh.ma_mon,
        GROUP_CONCAT(lhc.ten_lop SEPARATOR ', ') as cac_lop_hanh_chinh
      FROM BuoiHoc bh
      JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
      JOIN MonHoc mh ON lhp.monhoc_id = mh.monhoc_id
      LEFT JOIN LHP_LHC map ON lhp.lophocphan_id = map.lophocphan_id
      LEFT JOIN LopHanhChinh lhc ON map.lop_hanhchinh_id = lhc.lop_hanhchinh_id
      WHERE lhp.giangvien_id = '${gv001.giangvien_id}'
        AND lhp.hocky_id = '${hk2.hocky_id}'
        AND bh.giangvien_day_thay_id IS NULL
      GROUP BY bh.buoi_id
      ORDER BY bh.ngay ASC, bh.tiet_bat_dau ASC
      LIMIT 5
    `);

    console.log(`   Tổng số buổi: ${schedule.length}`);
    if (schedule.length > 0) {
      schedule.forEach((s, idx) => {
        console.log(`\n   ${idx + 1}. Môn: ${s.ten_mon}`);
        console.log(`      Ngày: ${s.ngay}`);
        console.log(`      Tiết: ${s.tiet_bat_dau}-${s.tiet_bat_dau + s.so_tiet - 1}`);
        console.log(`      Phòng: ${s.phong || s.lhp_phong}`);
        console.log(`      Lớp: ${s.cac_lop_hanh_chinh || 'N/A'}`);
      });
    } else {
      console.log('   ❌ KHÔNG CÓ BUỔI HỌC NÀO!\n');
      
      // Debug: Check if there are any BuoiHoc for this LopHocPhan
      console.log('🔍 Kiểm tra chi tiết:\n');
      
      const [debug1] = await sequelize.query(`
        SELECT COUNT(*) as total FROM BuoiHoc bh
        JOIN LopHocPhan lhp ON bh.lophocphan_id = lhp.lophocphan_id
        WHERE lhp.giangvien_id = '${gv001.giangvien_id}'
          AND lhp.hocky_id = '${hk2.hocky_id}'
      `);
      console.log(`   Tổng BuoiHoc của GV001 trong HK2: ${debug1[0].total}`);
      
      const [debug2] = await sequelize.query(`
        SELECT lhp.ma_lop, lhp.ten_lophocphan, COUNT(bh.buoi_id) as so_buoi
        FROM LopHocPhan lhp
        LEFT JOIN BuoiHoc bh ON lhp.lophocphan_id = bh.lophocphan_id
        WHERE lhp.giangvien_id = '${gv001.giangvien_id}'
          AND lhp.hocky_id = '${hk2.hocky_id}'
        GROUP BY lhp.lophocphan_id
      `);
      
      console.log('\n   Lớp học phần của GV001 trong HK2:');
      debug2.forEach(d => {
        console.log(`      ${d.ma_lop} - ${d.ten_lophocphan}: ${d.so_buoi} buổi`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAPIResponse();
