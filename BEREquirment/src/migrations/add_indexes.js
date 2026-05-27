const db = require('../models');

const addIndexSafely = async (tableName, indexName, columnsStr) => {
  try {
    const [results] = await db.sequelize.query(
      `SHOW INDEXES FROM \`${tableName}\` WHERE Key_name = '${indexName}'`
    );

    if (results.length === 0) {
      console.log(`>>> Đang tạo index "${indexName}" cho bảng "${tableName}"...`);
      await db.sequelize.query(
        `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnsStr})`
      );
      console.log(`✅ Đã tạo thành công index "${indexName}"!`);
    } else {
      console.log(`ℹ️ Index "${indexName}" trên bảng "${tableName}" đã tồn tại.`);
    }
  } catch (error) {
    console.error(`❌ Lỗi khi xử lý index "${indexName}" trên bảng "${tableName}":`, error.message);
  }
};

const run = async () => {
  try {
    console.log('>>> BẮT ĐẦU ĐÁNH CHỈ MỤC TỐI ƯU HÓA DATABASE...');
    await db.sequelize.authenticate();
    console.log(' Kêt nối Database thành công!');

    // 1. Tạo index cho bảng DiemDanh (buoi_id)
    await addIndexSafely('DiemDanh', 'idx_diemdanh_buoi_id', '`buoi_id`');

    // 2. Tạo index cho bảng DangKyHoc (lophocphan_id)
    await addIndexSafely('DangKyHoc', 'idx_dangkyhoc_lophocphan_id', '`lophocphan_id`');

    // 3. Tạo index cho bảng BuoiHoc (ngay)
    await addIndexSafely('BuoiHoc', 'idx_buoihoc_ngay', '`ngay`');

    console.log('🎉 TẤT CẢ CHỈ MỤC ĐÃ ĐƯỢC XỬ LÝ HOÀN TẤT!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi chạy script đánh chỉ mục:', error);
    process.exit(1);
  }
};

run();
