const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/models');

async function run() {
  try {
    console.log("=============================================================");
    console.log("BẮT ĐẦU KIỂM TRA VÀ SỬA KHÓA NGOẠI (FOREIGN KEY) CỦA BẢNG TAIKHOAN");
    console.log("=============================================================");

    // 1. Tìm tất cả các khóa ngoại (Foreign Keys) đang liên kết với bảng taikhoan
    const [foreignKeys] = await db.sequelize.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE()
        AND (TABLE_NAME = 'taikhoan' OR REFERENCED_TABLE_NAME = 'taikhoan')
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    console.log(`Tìm thấy ${foreignKeys.length} khóa ngoại liên quan đến bảng 'taikhoan':`);
    console.log(JSON.stringify(foreignKeys, null, 2));

    // 2. Tìm bất cứ khóa ngoại nào trên cột 'ref_id' của bảng 'taikhoan'
    // Vì 'ref_id' là khóa ngoại đa hình (polymorphic) liên kết với cả GiangVien và SinhVien,
    // nên nó KHÔNG ĐƯỢC có ràng buộc khóa ngoại cứng (foreign key constraint) ở mức cơ sở dữ liệu.
    // Nếu có ràng buộc cứng tới bảng giangvien, việc gán ref_id là sinhvien_id sẽ lỗi ngay lập tức.
    const refIdConstraints = foreignKeys.filter(
      fk => fk.TABLE_NAME === 'taikhoan' && fk.COLUMN_NAME === 'ref_id'
    );

    if (refIdConstraints.length > 0) {
      console.log(`\nPhát hiện ${refIdConstraints.length} ràng buộc khóa ngoại cứng trên cột 'ref_id':`);
      for (const constraint of refIdConstraints) {
        console.log(`-> Đang loại bỏ ràng buộc: ${constraint.CONSTRAINT_NAME}...`);
        await db.sequelize.query(`
          ALTER TABLE taikhoan DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
        console.log(`✅ Đã loại bỏ ràng buộc ${constraint.CONSTRAINT_NAME} thành công!`);
      }
    } else {
      console.log("\n✅ Tuyệt vời: Cột 'ref_id' của bảng 'taikhoan' không bị ràng buộc bởi bất kỳ khóa ngoại cứng nào.");
      console.log("Điều này cho phép cột 'ref_id' lưu trữ đa hình (mã sinh viên hoặc mã giảng viên) hoàn hảo!");
    }

    console.log("\n=============================================================");
    console.log("HOÀN TẤT KIỂM TRA VÀ CẤP NHẬT CƠ SỞ DỮ LIỆU!");
    console.log("=============================================================");

  } catch (error) {
    console.error("\n❌ LỖI TRONG QUÁ TRÌNH THỰC THI SCRIPT:", error.message);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

run();
