require('dotenv').config();
const db = require('../models');

async function ensureColumn(queryInterface, tableName, columnName, definition, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
    return true;
  }
  return false;
}

async function dropBoMonHeadForeignKeys(transaction) {
  const [rows] = await db.sequelize.query(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'BoMon'
        AND COLUMN_NAME = 'truong_bomon_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { transaction }
  );

  let dropped = 0;
  for (const row of rows || []) {
    if (!row?.CONSTRAINT_NAME) continue;
    await db.sequelize.query(
      `ALTER TABLE BoMon DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
      { transaction }
    );
    dropped += 1;
  }

  return dropped;
}

async function addBoMonHeadForeignKeyToTaiKhoan(transaction) {
  const [rows] = await db.sequelize.query(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'BoMon'
        AND COLUMN_NAME = 'truong_bomon_id'
        AND REFERENCED_TABLE_NAME = 'TaiKhoan'
      LIMIT 1
    `,
    { transaction }
  );

  if (rows?.length) {
    return false;
  }

  await db.sequelize.query(
    `
      ALTER TABLE BoMon
      ADD CONSTRAINT BoMon_truong_bomon_id_taikhoan_fk
      FOREIGN KEY (truong_bomon_id)
      REFERENCES TaiKhoan(taikhoan_id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
    `,
    { transaction }
  );

  return true;
}

async function ensureBoMonTable(queryInterface, transaction) {
  const allTables = await queryInterface.showAllTables({ transaction });
  const tableNames = allTables.map((t) => (typeof t === 'string' ? t : (t.tableName || t.table_name || '')));

  if (!tableNames.includes('BoMon')) {
    await queryInterface.createTable('BoMon', {
      bomon_id: {
        type: db.Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      khoa_id: {
        type: db.Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Khoa',
          key: 'khoa_id'
        }
      },
      ma_bomon: {
        type: db.Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      ten_bomon: {
        type: db.Sequelize.STRING(150),
        allowNull: false
      },
      truong_bomon_id: {
        type: db.Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'TaiKhoan',
          key: 'taikhoan_id'
        }
      },
      mota: {
        type: db.Sequelize.TEXT,
        allowNull: true
      },
      ngay_tao: {
        type: db.Sequelize.DATE,
        allowNull: true,
        defaultValue: db.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      isDeleted: {
        type: db.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, { transaction });

    return true;
  }

  return false;
}

async function ensureTaiKhoanRoleEnum(transaction) {
  const [rows] = await db.sequelize.query("SHOW COLUMNS FROM TaiKhoan LIKE 'vaitro'", { transaction });
  const columnType = rows?.[0]?.Type || rows?.[0]?.type || '';

  if (!columnType.includes("'truongbomon'")) {
    await db.sequelize.query(
      "ALTER TABLE TaiKhoan MODIFY COLUMN vaitro ENUM('admin','giangvien','lanhdao','truongbomon') NOT NULL",
      { transaction }
    );
    return true;
  }

  return false;
}

async function backfillBoMonData(transaction) {
  const [backfillBoMonTable] = await db.sequelize.query(
    `
      INSERT INTO BoMon (bomon_id, khoa_id, ma_bomon, ten_bomon, mota, ngay_tao, isDeleted)
      SELECT cn.chuyennganh_id,
             cn.khoa_id,
             cn.ma_chuyennganh,
             cn.ten_chuyennganh,
             cn.mota,
             cn.ngay_tao,
             cn.isDeleted
      FROM ChuyenNganh cn
      LEFT JOIN BoMon bm ON bm.bomon_id = cn.chuyennganh_id
      WHERE bm.bomon_id IS NULL
    `,
    { transaction }
  );

  const [subjectUpdateResult] = await db.sequelize.query(
    `
      UPDATE MonHoc mh
      JOIN (
        SELECT src.monhoc_id,
               SUBSTRING_INDEX(GROUP_CONCAT(src.chuyennganh_id ORDER BY src.cnt DESC SEPARATOR ','), ',', 1) AS best_chuyennganh_id
        FROM (
          SELECT lhp.monhoc_id, lhc.chuyennganh_id, COUNT(*) AS cnt
          FROM LopHocPhan lhp
          JOIN LHP_LHC map_lhc ON map_lhc.lophocphan_id = lhp.lophocphan_id
          JOIN LopHanhChinh lhc ON lhc.lop_hanhchinh_id = map_lhc.lop_hanhchinh_id
          WHERE lhp.monhoc_id IS NOT NULL AND lhc.chuyennganh_id IS NOT NULL
          GROUP BY lhp.monhoc_id, lhc.chuyennganh_id
        ) src
        GROUP BY src.monhoc_id
      ) picked ON picked.monhoc_id = mh.monhoc_id
      SET mh.chuyennganh_id = picked.best_chuyennganh_id
      WHERE mh.chuyennganh_id IS NULL
    `,
    { transaction }
  );

  const [syncKhoaResult] = await db.sequelize.query(
    `
      UPDATE MonHoc mh
      JOIN BoMon bm ON bm.bomon_id = mh.chuyennganh_id
      SET mh.khoa_id = bm.khoa_id
      WHERE mh.chuyennganh_id IS NOT NULL
        AND (mh.khoa_id IS NULL OR mh.khoa_id <> bm.khoa_id)
    `,
    { transaction }
  );

  return {
    insertedBoMon: backfillBoMonTable?.affectedRows || 0,
    updatedSubjects: subjectUpdateResult?.affectedRows || 0,
    syncedSubjectKhoa: syncKhoaResult?.affectedRows || 0
  };
}

async function backfillTruongBoMon(transaction) {
  const [convertExistingResult] = await db.sequelize.query(
    `
      UPDATE BoMon bm
      JOIN TaiKhoan tk
        ON tk.ref_id = bm.truong_bomon_id
       AND tk.vaitro = 'truongbomon'
      SET bm.truong_bomon_id = tk.taikhoan_id
      WHERE bm.truong_bomon_id IS NOT NULL
    `,
    { transaction }
  );

  const [headUpdateResult] = await db.sequelize.query(
    `
      UPDATE BoMon bm
      JOIN (
        SELECT m.bomon_id,
               SUBSTRING_INDEX(
                 GROUP_CONCAT(tk.taikhoan_id ORDER BY lhp.lophocphan_id SEPARATOR ','),
                 ',',
                 1
               ) AS taikhoan_id
        FROM LopHocPhan lhp
        JOIN MonHoc m ON m.monhoc_id = lhp.monhoc_id
        JOIN TaiKhoan tk
          ON tk.ref_id = lhp.giangvien_id
         AND tk.vaitro = 'truongbomon'
        WHERE lhp.giangvien_id IS NOT NULL
          AND m.bomon_id IS NOT NULL
        GROUP BY m.bomon_id
      ) src ON src.bomon_id = bm.bomon_id
      SET bm.truong_bomon_id = src.taikhoan_id
      WHERE bm.truong_bomon_id IS NULL
    `,
    { transaction }
  );

  const [cleanupInvalidResult] = await db.sequelize.query(
    `
      UPDATE BoMon bm
      LEFT JOIN TaiKhoan tk ON tk.taikhoan_id = bm.truong_bomon_id
      SET bm.truong_bomon_id = NULL
      WHERE bm.truong_bomon_id IS NOT NULL
        AND tk.taikhoan_id IS NULL
    `,
    { transaction }
  );

  return {
    convertedExisting: convertExistingResult?.affectedRows || 0,
    backfilledFromTeaching: headUpdateResult?.affectedRows || 0,
    cleanedInvalidRefs: cleanupInvalidResult?.affectedRows || 0
  };
}

async function run() {
  const queryInterface = db.sequelize.getQueryInterface();
  const transaction = await db.sequelize.transaction();

  try {
    await db.sequelize.authenticate();

    const createdBoMonTable = await ensureBoMonTable(queryInterface, transaction);

    const addedBoMonHeadColumn = await ensureColumn(
      queryInterface,
      'BoMon',
      'truong_bomon_id',
      {
        type: db.Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'TaiKhoan',
          key: 'taikhoan_id'
        }
      },
      transaction
    );

    const droppedOldBoMonHeadFks = await dropBoMonHeadForeignKeys(transaction);

    const addedMonHocBoMonColumn = await ensureColumn(
      queryInterface,
      'MonHoc',
      'chuyennganh_id',
      {
        type: db.Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'BoMon',
          key: 'bomon_id'
        }
      },
      transaction
    );

    const addedMonHocBoMonIdColumn = await ensureColumn(
      queryInterface,
      'MonHoc',
      'bomon_id',
      {
        type: db.Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'BoMon',
          key: 'bomon_id'
        }
      },
      transaction
    );

    const updatedRoleEnum = await ensureTaiKhoanRoleEnum(transaction);
    const backfill = await backfillBoMonData(transaction);
    const updatedTruongBoMon = await backfillTruongBoMon(transaction);
    const addedBoMonHeadFkToUser = await addBoMonHeadForeignKeyToTaiKhoan(transaction);

    const [syncMonHocBoMonIdResult] = await db.sequelize.query(
      `
        UPDATE MonHoc
        SET bomon_id = chuyennganh_id
        WHERE bomon_id IS NULL
          AND chuyennganh_id IS NOT NULL
      `,
      { transaction }
    );

    await transaction.commit();

    console.log('=== Sync bo mon schema hoàn tất ===');
  console.log(`Tạo bảng BoMon                    : ${createdBoMonTable ? 'Có' : 'Đã tồn tại'}`);
    console.log(`Thêm cột BoMon.truong_bomon_id      : ${addedBoMonHeadColumn ? 'Có' : 'Đã tồn tại'}`);
    console.log(`Gỡ FK cũ BoMon.truong_bomon_id      : ${droppedOldBoMonHeadFks}`);
    console.log(`Thêm cột MonHoc.chuyennganh_id      : ${addedMonHocBoMonColumn ? 'Có' : 'Đã tồn tại'}`);
    console.log(`Thêm cột MonHoc.bomon_id            : ${addedMonHocBoMonIdColumn ? 'Có' : 'Đã tồn tại'}`);
    console.log(`Cập nhật ENUM TaiKhoan.vaitro       : ${updatedRoleEnum ? 'Có thay đổi' : 'Đã đủ giá trị'}`);
  console.log(`Backfill ChuyenNganh -> BoMon       : ${backfill.insertedBoMon}`);
    console.log(`Backfill môn -> bộ môn              : ${backfill.updatedSubjects}`);
    console.log(`Đồng bộ MonHoc.bomon_id             : ${syncMonHocBoMonIdResult?.affectedRows || 0}`);
    console.log(`Chuyển GV ID -> User ID             : ${updatedTruongBoMon.convertedExisting}`);
    console.log(`Backfill trưởng bộ môn              : ${updatedTruongBoMon.backfilledFromTeaching}`);
    console.log(`Xóa tham chiếu user không hợp lệ    : ${updatedTruongBoMon.cleanedInvalidRefs}`);
    console.log(`Tạo FK BoMon -> TaiKhoan            : ${addedBoMonHeadFkToUser ? 'Có' : 'Đã tồn tại'}`);
    console.log(`Đồng bộ khoa theo bộ môn            : ${backfill.syncedSubjectKhoa}`);
    console.log('===================================');
  } catch (error) {
    await transaction.rollback();
    console.error('Sync bo mon schema thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
