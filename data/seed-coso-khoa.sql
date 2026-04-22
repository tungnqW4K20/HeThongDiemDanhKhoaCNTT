USE tot_nghiep;

INSERT INTO `coso` VALUES
('6a05f0e4-f5bf-11f0-a70d-00ffa2e714a5','Cơ sở Khoái Châu','Khoái Châu, Hưng Yên','Cơ sở Khoái Châu',0,'2026-01-20 12:18:11'),
('6a05fc5a-f5bf-11f0-a70d-00ffa2e714a5','Cơ sở Mỹ Hào','Mỹ Hào, Hưng Yên','Cơ sở Mỹ Hào',0,'2026-01-20 12:18:11'),
('6a05fe54-f5bf-11f0-a70d-00ffa2e714a5','Cơ sở Hải Dương','Hải Dương','Cơ sở Hải Dương',0,'2026-01-20 12:18:11');

INSERT INTO `khoa` VALUES
('865c7683-9887-4284-bf3e-74f9f01e876c','KT','Kế toán','','2026-01-20 08:49:57',0),
('d719fcf3-f5be-11f0-a70d-00ffa2e714a5','CNTT','Công nghệ thông tin','Khoa đào tạo và nghiên cứu công nghệ thông tin','2026-01-20 12:14:04',0);

INSERT INTO `chuyennganh` (`chuyennganh_id`, `khoa_id`, `ma_chuyennganh`, `ten_chuyennganh`, `mota`, `isDeleted`, `ngay_tao`) VALUES
('c4109f4a-f6a2-4e61-9b53-0d9562b14001','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','CNPM','Kỹ thuật phần mềm ứng dụng','Định hướng xây dựng giải pháp phần mềm từ phân tích yêu cầu đến triển khai vận hành',0,'2026-01-20 12:19:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14002','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','KHMT','Trí tuệ tính toán và khoa học dữ liệu','Định hướng nền tảng thuật toán, mô hình dữ liệu và kỹ thuật tính toán hiện đại',0,'2026-01-20 12:19:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14003','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','HTTT','Quản trị hệ thống thông tin doanh nghiệp','Định hướng phân tích nghiệp vụ, tích hợp dữ liệu và quản trị hệ thống thông tin tổ chức',0,'2026-01-20 12:19:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14004','865c7683-9887-4284-bf3e-74f9f01e876c','KTDN','Kế toán và kiểm toán doanh nghiệp','Định hướng hệ thống kế toán quản trị, kiểm soát nội bộ và tuân thủ tài chính doanh nghiệp',0,'2026-01-20 12:19:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14005','865c7683-9887-4284-bf3e-74f9f01e876c','KTTC','Tài chính kế toán ứng dụng','Định hướng phân tích báo cáo tài chính, quản trị vốn và chuẩn mực kế toán thực hành',0,'2026-01-20 12:19:00');

INSERT INTO `bomon` VALUES
('2f4b1ef0-1642-4c7d-a7d4-c1f3a1f31a01','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','CNPM','Bộ môn Công nghệ phần mềm',NULL,'Phụ trách học phần lập trình ứng dụng, kiểm thử và triển khai phần mềm', '2026-01-20 12:20:00',0),
('2f4b1ef0-1642-4c7d-a7d4-c1f3a1f31a02','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','KHMT','Bộ môn Khoa học máy tính',NULL,'Phụ trách học phần cấu trúc dữ liệu, thuật toán và các phương pháp tính toán', '2026-01-20 12:20:00',0);

INSERT INTO `NamHoc` (`namhoc_id`, `ten_namhoc`, `ngay_batdau`, `ngay_ketthuc`) VALUES
('f8d8010b-0a8c-44d4-b6c0-cfdd4db50b26','2025-2026','2025-08-01','2026-06-15');

INSERT INTO `HocKy` (`hocky_id`, `ten_hocky`, `ngay_batdau`, `ngay_ketthuc`, `ngay_monday_tuan_1`, `namhoc_id`, `tuan_bat_dau_co_lich`) VALUES
('8f2d8d1c-d9dd-43d6-b42b-77c9e6a1fd81','Học kỳ 1 - Năm học 2025-2026','2025-08-01','2026-01-18','2025-07-28','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b26',1),
('33cb5f46-94e9-4f2f-a398-2f7f6fbc9af3','Học kỳ 2 - Năm học 2025-2026','2026-01-19','2026-06-15','2026-01-19','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b26',23);

-- Them du lieu da dang hon cho khoa
INSERT INTO `khoa` VALUES
('12fdf7ac-4f77-4bc1-96ab-7dc8194a1001','QTKD','Quản trị kinh doanh','Khoa đào tạo các ngành quản trị và kinh doanh','2026-01-20 12:30:00',0),
('12fdf7ac-4f77-4bc1-96ab-7dc8194a1002','CK','Cơ khí','Khoa đào tạo cơ khí và chế tạo máy','2026-01-20 12:30:00',0),
('12fdf7ac-4f77-4bc1-96ab-7dc8194a1003','DTVT','Điện - Điện tử','Khoa đào tạo điện, điện tử và tự động hóa','2026-01-20 12:30:00',0);

INSERT INTO `chuyennganh` (`chuyennganh_id`, `khoa_id`, `ma_chuyennganh`, `ten_chuyennganh`, `mota`, `isDeleted`, `ngay_tao`) VALUES
('c4109f4a-f6a2-4e61-9b53-0d9562b14006','12fdf7ac-4f77-4bc1-96ab-7dc8194a1001','MKT','Truyền thông tiếp thị tích hợp','Định hướng chiến lược thương hiệu, truyền thông số và hành vi khách hàng',0,'2026-01-20 12:34:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14007','12fdf7ac-4f77-4bc1-96ab-7dc8194a1001','QTKD','Quản trị vận hành doanh nghiệp','Định hướng quản trị chuỗi giá trị, nhân sự và tối ưu hiệu quả vận hành',0,'2026-01-20 12:34:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14008','12fdf7ac-4f77-4bc1-96ab-7dc8194a1002','CKCTM','Thiết kế và chế tạo cơ điện tử','Định hướng thiết kế sản phẩm cơ khí, quy trình công nghệ và tích hợp hệ thống',0,'2026-01-20 12:34:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14009','12fdf7ac-4f77-4bc1-96ab-7dc8194a1002','CADCAM','Kỹ thuật thiết kế số trong cơ khí','Định hướng ứng dụng CAD/CAM/CAE vào mô phỏng, lập trình gia công và kiểm định',0,'2026-01-20 12:34:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14010','12fdf7ac-4f77-4bc1-96ab-7dc8194a1003','DCDT','Hệ thống điện và năng lượng thông minh','Định hướng thiết kế mạng điện, vận hành an toàn và tích hợp giải pháp năng lượng',0,'2026-01-20 12:34:00'),
('c4109f4a-f6a2-4e61-9b53-0d9562b14011','12fdf7ac-4f77-4bc1-96ab-7dc8194a1003','TDH','Điều khiển và tự động hóa công nghiệp','Định hướng điều khiển quá trình, PLC/SCADA và hệ thống sản xuất thông minh',0,'2026-01-20 12:34:00');

-- Them bo mon cho cac khoa
INSERT INTO `bomon` VALUES
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2001','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','HTTT','Bộ môn Phân tích hệ thống nghiệp vụ',NULL,'Phụ trách học phần phân tích yêu cầu, mô hình hóa quy trình và thiết kế hệ thống thông tin', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2002','d719fcf3-f5be-11f0-a70d-00ffa2e714a5','ATTT','Bộ môn An ninh mạng và bảo mật',NULL,'Phụ trách học phần an toàn hệ thống, mật mã ứng dụng và quản trị bảo mật', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2003','865c7683-9887-4284-bf3e-74f9f01e876c','KTDN','Bộ môn Kế toán quản trị',NULL,'Phụ trách học phần kế toán chi phí, lập ngân sách và phân tích hiệu quả hoạt động', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2004','865c7683-9887-4284-bf3e-74f9f01e876c','KTTC','Bộ môn Báo cáo tài chính',NULL,'Phụ trách học phần báo cáo tài chính, hợp nhất báo cáo và chuẩn mực kế toán', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2005','12fdf7ac-4f77-4bc1-96ab-7dc8194a1001','MKT','Bộ môn Chiến lược marketing số',NULL,'Phụ trách học phần quảng cáo số, nội dung số và đo lường hiệu quả chiến dịch', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2006','12fdf7ac-4f77-4bc1-96ab-7dc8194a1001','QTKD_BM','Bộ môn Quản trị tác nghiệp',NULL,'Phụ trách học phần quản trị vận hành, logistics và tối ưu quy trình doanh nghiệp', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2007','12fdf7ac-4f77-4bc1-96ab-7dc8194a1002','CKCTM','Bộ môn Công nghệ gia công cơ khí',NULL,'Phụ trách học phần gia công CNC, dung sai lắp ghép và công nghệ vật liệu cơ khí', '2026-01-20 12:35:00',0),
('3b110f90-c8ef-4f8b-9f2d-55c1ac6b2008','12fdf7ac-4f77-4bc1-96ab-7dc8194a1003','DCDT','Bộ môn Thiết kế hệ thống điện',NULL,'Phụ trách học phần thiết kế mạng điện, bảo vệ rơ-le và vận hành hệ thống điện công nghiệp', '2026-01-20 12:35:00',0);

-- Them nam hoc
INSERT INTO `NamHoc` (`namhoc_id`, `ten_namhoc`, `ngay_batdau`, `ngay_ketthuc`) VALUES
('f8d8010b-0a8c-44d4-b6c0-cfdd4db50b24','2024-2025','2024-08-01','2025-06-15'),
('f8d8010b-0a8c-44d4-b6c0-cfdd4db50b27','2026-2027','2026-08-01','2027-06-15');

-- Them hoc ky cho cac nam hoc
INSERT INTO `HocKy` (`hocky_id`, `ten_hocky`, `ngay_batdau`, `ngay_ketthuc`, `ngay_monday_tuan_1`, `namhoc_id`, `tuan_bat_dau_co_lich`) VALUES
('8f2d8d1c-d9dd-43d6-b42b-77c9e6a1fd71','Học kỳ 1 - Năm học 2024-2025','2024-08-01','2025-01-19','2024-07-29','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b24',1),
('8f2d8d1c-d9dd-43d6-b42b-77c9e6a1fd72','Học kỳ 2 - Năm học 2024-2025','2025-01-20','2025-06-15','2025-01-20','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b24',23),
('8f2d8d1c-d9dd-43d6-b42b-77c9e6a1fd91','Học kỳ 1 - Năm học 2026-2027','2026-08-01','2027-01-17','2026-07-27','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b27',1),
('8f2d8d1c-d9dd-43d6-b42b-77c9e6a1fd92','Học kỳ 2 - Năm học 2026-2027','2027-01-18','2027-06-15','2027-01-18','f8d8010b-0a8c-44d4-b6c0-cfdd4db50b27',23);

-- Seed tai khoan admin
INSERT INTO `taikhoan` (`taikhoan_id`, `username`, `password_hash`, `vaitro`, `ref_id`, `ngay_tao`) VALUES
('1fd6ec5f-2ea9-4988-90f9-ef16b3363101','admin','$2b$10$wNcxn5cQl9JGoq74tANYvu90eNofJcrMeOZOpYPXm2c1W2geryyFS','admin',NULL,'2026-04-20 10:00:00')
ON DUPLICATE KEY UPDATE
`password_hash` = VALUES(`password_hash`),
`vaitro` = VALUES(`vaitro`),
`ref_id` = VALUES(`ref_id`);

