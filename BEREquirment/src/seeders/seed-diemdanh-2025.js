/**
 * Seed data điểm danh cho năm 2025
 * Chạy: node src/seeders/seed-diemdanh-2025.js
 * 
 * Tạo:
 * - BuoiHoc cho các lớp học phần
 * - DiemDanh cho sinh viên trong các buổi đó
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('../models');
const { Op } = require('sequelize');

// Helper: Tính ngày học dựa trên thứ và tuần
function calculateDate(mondayWeek1, weekNumber, dayOfWeek) {
  const date = new Date(mondayWeek1);
  // dayOfWeek: 2=T2, 3=T3, ..., 7=T7, 8=CN
  const offset = (weekNumber - 1) * 7 + (dayOfWeek === 8 ? 6 : dayOfWeek - 2);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
}

async function seedDiemDanh2025() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    const { LopHocPhan, HocKy, BuoiHoc, DangKyHoc, DiemDanh, SinhVien, MonHoc } = db;

    // Lấy các học kỳ năm 2024-2025 và 2025-2026
    const hocKys = await HocKy.findAll({
      where: {
        ten_hocky: {
          [Op.in]: [
            'Học kỳ 1 (2024-2025)',
            'Học kỳ 2 (2024-2025)', 
            'Học kỳ 1 (2025-2026)',
            'Học kỳ 2 (2025-2026)'
          ]
        }
      }
    });

    console.log(`📚 Tìm thấy ${hocKys.length} học kỳ\n`);

    let totalBuoiHoc = 0;
    let totalDiemDanh = 0;

    // Duyệt qua từng học kỳ
    for (const hocKy of hocKys) {
      console.log(`\n📌 Đang seed: ${hocKy.ten_hocky}`);
      console.log(`   Từ ${hocKy.ngay_batdau} đến ${hocKy.ngay_ketthuc}`);

      // Lấy các lớp học phần trong học kỳ này
      const lopHocPhans = await LopHocPhan.findAll({
        where: { hocky_id: hocKy.hocky_id },
        include: [
          { model: MonHoc, attributes: ['ma_mon', 'ten_mon'] }
        ]
      });

      console.log(`   Tìm thấy ${lopHocPhans.length} lớp học phần`);

      // Duyệt qua từng lớp học phần
      for (const lhp of lopHocPhans) {
        // Parse tuan_hoc - có thể là string JSON hoặc array
        let tuanHoc = lhp.tuan_hoc || [];
        if (typeof tuanHoc === 'string') {
          try {
            tuanHoc = JSON.parse(tuanHoc);
          } catch (e) {
            tuanHoc = [];
          }
        }
        if (!Array.isArray(tuanHoc)) {
          tuanHoc = [];
        }
        
        console.log(`\n   🔹 ${lhp.ma_lop} - ${lhp.MonHoc?.ten_mon}`);
        console.log(`      Thứ ${lhp.thu}, Tiết ${lhp.tiet_bat_dau}-${lhp.tiet_bat_dau + lhp.so_tiet - 1}, Phòng ${lhp.phong}`);
        console.log(`      Tuần học: [${tuanHoc.join(', ')}]`);

        // Tạo buổi học cho mỗi tuần
        for (const tuan of tuanHoc) {
          const ngayHoc = calculateDate(
            hocKy.ngay_monday_tuan_1, 
            tuan, 
            lhp.thu
          );

          // Kiểm tra ngày học có nằm trong khoảng học kỳ không
          if (ngayHoc < hocKy.ngay_batdau || ngayHoc > hocKy.ngay_ketthuc) {
            continue;
          }

          // Tạo BuoiHoc
          const [buoiHoc, created] = await BuoiHoc.findOrCreate({
            where: {
              lophocphan_id: lhp.lophocphan_id,
              ngay: ngayHoc
            },
            defaults: {
              tiet_bat_dau: lhp.tiet_bat_dau,
              so_tiet: lhp.so_tiet,
              phong: lhp.phong,
              tuan_hoc: tuan,
              trangthai: ngayHoc < new Date().toISOString().split('T')[0] ? 'completed' : 'scheduled',
              ghi_chu: null
            }
          });

          if (created) {
            totalBuoiHoc++;

            // Lấy danh sách sinh viên đã đăng ký học phần này
            const dangKyHocs = await DangKyHoc.findAll({
              where: { 
                lophocphan_id: lhp.lophocphan_id,
                trangthai: 'active'
              },
              include: [{ model: SinhVien, attributes: ['ma_sv', 'ten'] }]
            });

            // Tạo điểm danh cho sinh viên
            for (const dk of dangKyHocs) {
              // Random trạng thái điểm danh cho data mẫu
              const random = Math.random();
              let trangthai = 'present'; // 80% có mặt
              let ghichu = null;

              if (random > 0.8 && random <= 0.9) {
                trangthai = 'absent'; // 10% vắng không phép
                ghichu = 'Vắng không lý do';
              } else if (random > 0.9) {
                trangthai = 'excused'; // 10% vắng có phép
                ghichu = 'Ốm, có giấy bác sĩ';
              }

              await DiemDanh.create({
                buoi_id: buoiHoc.buoi_id,
                sinhvien_id: dk.sinhvien_id,
                trangthai: trangthai,
                ghichu: ghichu,
                ngay_diemdanh: ngayHoc
              });

              totalDiemDanh++;
            }
          }
        }

        console.log(`      ✅ Đã tạo ${tuanHoc.length} buổi học`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Seed data điểm danh 2025 hoàn tất!');
    console.log('='.repeat(60));
    console.log(`📊 Thống kê:`);
    console.log(`   • Buổi học đã tạo: ${totalBuoiHoc}`);
    console.log(`   • Bản ghi điểm danh: ${totalDiemDanh}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Lỗi khi seed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seedDiemDanh2025();
