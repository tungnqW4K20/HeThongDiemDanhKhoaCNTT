/**
 * Script chạy tất cả seeder theo thứ tự
 * Chạy: node src/seeders/run-all-seeders.js
 */

const { exec } = require('child_process');
const path = require('path');

const seeders = [
  { name: 'Admin', file: 'seed-admin.js', desc: 'Tạo tài khoản admin' },
  { name: 'Data cơ bản', file: 'seed-data.js', desc: 'Tạo khoa, giảng viên, sinh viên, lớp học' },
  { name: 'Điểm danh 2025', file: 'seed-diemdanh-2025.js', desc: 'Tạo buổi học và điểm danh năm 2025' }
];

async function runSeeder(seeder) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 Đang chạy: ${seeder.name}`);
    console.log(`   ${seeder.desc}`);
    console.log(`${'='.repeat(70)}\n`);

    const seedPath = path.join(__dirname, seeder.file);
    const cmd = `node "${seedPath}"`;

    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      if (error) {
        console.error(`\n❌ Lỗi khi chạy ${seeder.name}:`, error.message);
        reject(error);
      } else {
        console.log(`\n✅ Hoàn thành: ${seeder.name}\n`);
        resolve();
      }
    });
  });
}

async function runAllSeeders() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        SEED TOÀN BỘ DỮ LIỆU HỆ THỐNG ĐIỂM DANH KHOA CNTT         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  try {
    for (const seeder of seeders) {
      await runSeeder(seeder);
      // Đợi 2 giây giữa các seeder
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉🎉🎉 HOÀN THÀNH TẤT CẢ SEEDER! 🎉🎉🎉');
    console.log('='.repeat(70));
    console.log('\n📋 THÔNG TIN ĐĂNG NHẬP:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │  Admin:  admin / Admin@123              │');
    console.log('   │  GV:     gv001 / Gv@123456              │');
    console.log('   │  GV:     gv002 / Gv@123456              │');
    console.log('   │  GV:     gv003 / Gv@123456              │');
    console.log('   └─────────────────────────────────────────┘');
    console.log('\n💡 Dữ liệu đã được seed thành công!');
    console.log('   • Khoa, chuyên ngành, năm học, học kỳ');
    console.log('   • Giảng viên, sinh viên, lớp học');
    console.log('   • Buổi học và điểm danh năm 2025\n');

  } catch (error) {
    console.error('\n❌❌❌ CÓ LỖI XẢY RA! ❌❌❌');
    console.error('Vui lòng kiểm tra log ở trên.\n');
    process.exit(1);
  }
}

runAllSeeders();
