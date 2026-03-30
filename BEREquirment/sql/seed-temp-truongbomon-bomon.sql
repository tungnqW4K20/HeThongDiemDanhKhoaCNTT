-- Temporary seed for 1 truongbomon account + 1 BoMon
-- MySQL/MariaDB script. Safe to run multiple times.

START TRANSACTION;

-- 1) Config
SET @khoa_ma := 'TMPK';
SET @khoa_ten := 'Khoa Tam';
SET @bomon_ma := 'BMTMP';
SET @bomon_ten := 'Bo Mon Tam';
SET @tbm_username := 'truongbomon_tmp';
SET @tbm_password_bcrypt := '$2b$10$o08XjYB/8XHzb5qBExU6dOJzP6qGX0WU7nMfANnQwh/LP3MpGXLjK';

-- 1.1) Ensure TaiKhoan.vaitro enum contains 'truongbomon'
SET @vaitro_column_type := (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TaiKhoan'
    AND COLUMN_NAME = 'vaitro'
  LIMIT 1
);

SET @enum_with_truongbomon := IF(
  LOCATE("'truongbomon'", IFNULL(@vaitro_column_type, '')) > 0,
  NULL,
  REPLACE(@vaitro_column_type, ')', ',''truongbomon'')')
);

SET @alter_vaitro_sql := IF(
  @enum_with_truongbomon IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE TaiKhoan MODIFY COLUMN vaitro ', @enum_with_truongbomon, ' NOT NULL')
);

PREPARE stmt_vaitro FROM @alter_vaitro_sql;
EXECUTE stmt_vaitro;
DEALLOCATE PREPARE stmt_vaitro;

-- 2) Ensure Khoa exists
SET @khoa_id := (
  SELECT khoa_id
  FROM Khoa
  WHERE ma_khoa = @khoa_ma
  LIMIT 1
);

INSERT INTO Khoa (khoa_id, ma_khoa, ten_khoa, mota, ngay_tao, isDeleted)
SELECT UUID(), @khoa_ma, @khoa_ten, 'Seed tam cho tai khoan truong bo mon', NOW(), 0
FROM DUAL
WHERE @khoa_id IS NULL;

SET @khoa_id := (
  SELECT khoa_id
  FROM Khoa
  WHERE ma_khoa = @khoa_ma
  LIMIT 1
);

-- 3) Ensure TaiKhoan truongbomon exists
SET @tbm_taikhoan_id := (
  SELECT taikhoan_id
  FROM TaiKhoan
  WHERE username = @tbm_username
  LIMIT 1
);

INSERT INTO TaiKhoan (taikhoan_id, username, password_hash, vaitro, ref_id, ngay_tao)
SELECT UUID(), @tbm_username, @tbm_password_bcrypt, 'truongbomon', NULL, NOW()
FROM DUAL
WHERE @tbm_taikhoan_id IS NULL;

SET @tbm_taikhoan_id := (
  SELECT taikhoan_id
  FROM TaiKhoan
  WHERE username = @tbm_username
  LIMIT 1
);

-- Optional: keep account fields up to date on re-run
UPDATE TaiKhoan
SET password_hash = @tbm_password_bcrypt,
    vaitro = 'truongbomon'
WHERE taikhoan_id = @tbm_taikhoan_id;

-- 4) Ensure BoMon exists and points to TaiKhoan (user)
SET @bomon_id := (
  SELECT bomon_id
  FROM BoMon
  WHERE ma_bomon = @bomon_ma
  LIMIT 1
);

INSERT INTO BoMon (bomon_id, khoa_id, ma_bomon, ten_bomon, truong_bomon_id, mota, ngay_tao, isDeleted)
SELECT UUID(), @khoa_id, @bomon_ma, @bomon_ten, @tbm_taikhoan_id, 'Bo mon tam de test', NOW(), 0
FROM DUAL
WHERE @bomon_id IS NULL;

UPDATE BoMon
SET khoa_id = @khoa_id,
    ten_bomon = @bomon_ten,
    truong_bomon_id = @tbm_taikhoan_id,
    isDeleted = 0
WHERE ma_bomon = @bomon_ma;

COMMIT;

-- 5) Verify
SELECT taikhoan_id, username, vaitro
FROM TaiKhoan
WHERE username = @tbm_username;

SELECT bomon_id, ma_bomon, ten_bomon, truong_bomon_id, khoa_id
FROM BoMon
WHERE ma_bomon = @bomon_ma;
