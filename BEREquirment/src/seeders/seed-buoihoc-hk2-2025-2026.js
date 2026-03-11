/**
 * Seed tất cả buổi học cho Học kỳ 2 (2025-2026)
 * Chạy: node src/seeders/seed-buoihoc-hk2-2025-2026.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('../models');

async function seedBuoiHoc() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    // Lấy học kỳ 2 (2025-2026)
    const hocKy = await db.HocKy.findOne({
      where: { ten_hocky: 'Học kỳ 2 (2025-2026)' },
      include: [{
        model: db.NamHoc,
        as: 'NamHoc',
        attributes: ['ten_namhoc']
      }]
    });

    if (!hocKy) {
      console.error('❌ Không tìm thấy Học kỳ 2 (2025-2026)');
      process.exit(1);
    }

    console.log(`📚 Học kỳ: ${hocKy.ten_hocky}`);
    console.log(`   Ngày bắt đầu tuần 1: ${hocKy.ngay_monday_tuan_1}`);
    console.log(`   Ngày kết thúc: ${hocKy.ngay_ketthuc}\n`);

    // Lấy tất cả lớp học phần của học kỳ 2 (2025-2026)
    const lopHocPhans = await db.LopHocPhan.findAll({
      where: { hocky_id: hocKy.hocky_id },
      include: [
        {
          model: db.MonHoc,
          as: 'MonHoc',
          attributes: ['ten_mon']
        },
        {
          model: db.GiangVien,
          as: 'GiangVien',
          attributes: ['ho', 'ten']
        }
      ]
    });

    if (lopHocPhans.length === 0) {
      console.log('⚠️  Không có lớp học phần nào cho học kỳ này.');
      process.exit(0);
    }

    console.log(`✔ Tìm thấy ${lopHocPhans.length} lớp học phần\n`);

    const mondayWeek1 = new Date(hocKy.ngay_monday_tuan_1);
    const thuMapping = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const lhp of lopHocPhans) {
      const tenMon = lhp.MonHoc?.ten_mon || 'N/A';
      const tenGV = lhp.GiangVien ? `${lhp.GiangVien.ten}` : 'N/A';
      const thuText = thuMapping[lhp.thu] || `Thứ ${lhp.thu}`;

      console.log(`🔍 Lớp: ${lhp.ma_lop} - ${tenMon} - ${tenGV} - ${thuText}`);
      
      // Parse tuan_hoc nếu là JSON string
      let tuanHocArray = lhp.tuan_hoc;
      if (typeof tuanHocArray === 'string') {
        try {
          tuanHocArray = JSON.parse(tuanHocArray);
        } catch (e) {
          console.log('   ⚠️  Không thể parse tuan_hoc, bỏ qua.\n');
          continue;
        }
      }
      
      if (!tuanHocArray || tuanHocArray.length === 0) {
        console.log('   ⚠️  Không có thông tin tuần học, bỏ qua.\n');
        continue;
      }

      console.log(`   → Tạo buổi học cho ${tuanHocArray.length} tuần: ${tuanHocArray.join(', ')}\n`);

      for (const weekNum of tuanHocArray) {
        // Tính ngày của buổi học
        const daysToAdd = (weekNum - 1) * 7 + (lhp.thu === 1 ? 0 : lhp.thu - 1);
        const ngayHoc = new Date(mondayWeek1);
        ngayHoc.setDate(mondayWeek1.getDate() + daysToAdd);

        const ngayHocStr = ngayHoc.toISOString().split('T')[0];

        // Kiểm tra xem buổi học đã tồn tại chưa
        const existing = await db.BuoiHoc.findOne({
          where: {
            lophocphan_id: lhp.lophocphan_id,
            ngay: ngayHocStr
          }
        });

        if (existing) {
          console.log(`   ⏭️  Tuần ${weekNum} - ${ngayHocStr} (đã tồn tại, bỏ qua)`);
          totalSkipped++;
          continue;
        }

        // Tạo buổi học mới
        await db.BuoiHoc.create({
          lophocphan_id: lhp.lophocphan_id,
          ngay: ngayHocStr,
          tuan: weekNum,
          thu: lhp.thu,
          tiet_bat_dau: lhp.tiet_bat_dau,
          so_tiet: lhp.so_tiet,
          phong_hoc: lhp.phong_hoc,
          trang_thai: 'scheduled'
        });

        console.log(`   ✅ Tuần ${weekNum} - ${ngayHocStr}`);
        totalCreated++;
      }

      console.log('');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Hoàn tất seed buổi học!`);
    console.log(`   📌 Số buổi học mới tạo: ${totalCreated}`);
    console.log(`   ⏭️  Số buổi đã tồn tại: ${totalSkipped}`);
    console.log(`   📊 Tổng số buổi: ${totalCreated + totalSkipped}`);
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

seedBuoiHoc();
