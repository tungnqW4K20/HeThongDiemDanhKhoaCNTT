/**
 * Seed dữ liệu mẫu cho hệ thống điểm danh Khoa CNTT
 * Chạy: node src/seeders/seed-data.js
 *
 * Thứ tự seed:
 *  1. Khoa
 *  2. ChuyenNganh
 *  3. NamHoc
 *  4. HocKy
 *  5. GiangVien + TaiKhoan GV
 *  6. MonHoc
 *  7. LopHanhChinh
 *  8. SinhVien
 *  9. LopHocPhan
 * 10. DangKyHoc (SV đăng ký học phần)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db = require('../models');

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────
// 1. KHOA
// ─────────────────────────────────────────────────────────────
const KHOA_DATA = [
  { ma_khoa: 'CNTT',  ten_khoa: 'Khoa Công nghệ Thông tin' },
  { ma_khoa: 'DTVT',  ten_khoa: 'Khoa Điện tử Viễn thông' },
  { ma_khoa: 'CK',    ten_khoa: 'Khoa Cơ khí' },
  { ma_khoa: 'KT',    ten_khoa: 'Khoa Kinh tế' },
];

// ─────────────────────────────────────────────────────────────
// 2. CHUYÊN NGÀNH (thuộc Khoa CNTT)
// ─────────────────────────────────────────────────────────────
const CHUYEN_NGANH_DATA = [
  { ma_chuyennganh: 'KTPM',  ten_chuyennganh: 'Kỹ thuật Phần mềm',        khoa_ma: 'CNTT' },
  { ma_chuyennganh: 'HTTT',  ten_chuyennganh: 'Hệ thống Thông tin',        khoa_ma: 'CNTT' },
  { ma_chuyennganh: 'MMMT',  ten_chuyennganh: 'Mạng máy tính & TT',        khoa_ma: 'CNTT' },
  { ma_chuyennganh: 'TTNT',  ten_chuyennganh: 'Trí tuệ Nhân tạo',          khoa_ma: 'CNTT' },
];

// ─────────────────────────────────────────────────────────────
// 3. NĂM HỌC
// ─────────────────────────────────────────────────────────────
const NAM_HOC_DATA = [
  { ten_namhoc: '2025-2026', ngay_batdau: '2025-09-01', ngay_ketthuc: '2026-06-30' },
];

// ─────────────────────────────────────────────────────────────
// 4. HỌC KỲ
// ─────────────────────────────────────────────────────────────
// ngay_monday_tuan_1: Thứ 2 đầu tiên của tuần 1 học kỳ
const HOC_KY_DATA = [
  {
    ten_hocky: 'Học kỳ 1 (2025-2026)',
    ngay_batdau: '2025-09-01',
    ngay_ketthuc: '2026-01-11',
    ngay_monday_tuan_1: '2025-09-01',
    tuan_bat_dau_co_lich: 1,
    namhoc_ten: '2025-2026'
  },
  {
    ten_hocky: 'Học kỳ 2 (2025-2026)',
    ngay_batdau: '2026-01-19',
    ngay_ketthuc: '2026-06-14',
    ngay_monday_tuan_1: '2026-01-19',
    tuan_bat_dau_co_lich: 1,
    namhoc_ten: '2025-2026'
  },
];

// ─────────────────────────────────────────────────────────────
// 5. GIẢNG VIÊN
// ─────────────────────────────────────────────────────────────
const GIANG_VIEN_DATA = [
  { ma_gv: 'GV001', ho: 'Nguyễn Văn',   ten: 'An',    email: 'nvan.an@hust.edu.vn',   sdt: '0912000001', khoa_ma: 'CNTT' },
  { ma_gv: 'GV002', ho: 'Trần Thị',     ten: 'Bình',  email: 'tthi.binh@hust.edu.vn', sdt: '0912000002', khoa_ma: 'CNTT' },
  { ma_gv: 'GV003', ho: 'Lê Minh',      ten: 'Cường', email: 'lminh.cuong@hust.edu.vn', sdt: '0912000003', khoa_ma: 'CNTT' },
  { ma_gv: 'GV004', ho: 'Phạm Thị',     ten: 'Dung',  email: 'pthi.dung@hust.edu.vn',  sdt: '0912000004', khoa_ma: 'CNTT' },
  { ma_gv: 'GV005', ho: 'Hoàng Văn',    ten: 'Em',    email: 'hvan.em@hust.edu.vn',    sdt: '0912000005', khoa_ma: 'CNTT' },
];

// ─────────────────────────────────────────────────────────────
// 6. MÔN HỌC
// ─────────────────────────────────────────────────────────────
const MON_HOC_DATA = [
  { ma_mon: 'INT1001', ten_mon: 'Nhập môn Lập trình',              sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT1002', ten_mon: 'Cấu trúc Dữ liệu & Giải thuật',  sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT1003', ten_mon: 'Lập trình Hướng đối tượng',       sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT2001', ten_mon: 'Cơ sở Dữ liệu',                   sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT2002', ten_mon: 'Mạng máy tính',                   sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT2003', ten_mon: 'Lập trình Web',                   sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT3001', ten_mon: 'Kỹ thuật Phần mềm',              sotinchi: 3, khoa_ma: 'CNTT' },
  { ma_mon: 'INT3002', ten_mon: 'Học máy',                         sotinchi: 3, khoa_ma: 'CNTT' },
];

// ─────────────────────────────────────────────────────────────
// 7. LỚP HÀNH CHÍNH
// ─────────────────────────────────────────────────────────────
const LOP_HANH_CHINH_DATA = [
  { ten_lop: 'CNTT1-K20',  nien_khoa: 2020, khoa_ma: 'CNTT', chuyen_nganh_ma: 'KTPM', gvcn_ma: 'GV001' },
  { ten_lop: 'CNTT2-K20',  nien_khoa: 2020, khoa_ma: 'CNTT', chuyen_nganh_ma: 'HTTT', gvcn_ma: 'GV002' },
  { ten_lop: 'CNTT1-K21',  nien_khoa: 2021, khoa_ma: 'CNTT', chuyen_nganh_ma: 'KTPM', gvcn_ma: 'GV003' },
  { ten_lop: 'CNTT2-K21',  nien_khoa: 2021, khoa_ma: 'CNTT', chuyen_nganh_ma: 'MMMT', gvcn_ma: 'GV004' },
];

// ─────────────────────────────────────────────────────────────
// 8. SINH VIÊN (5 SV/lớp)
// ─────────────────────────────────────────────────────────────
// Được tạo động bên dưới dựa vào danh sách LHC

// ─────────────────────────────────────────────────────────────
// 9. LỚP HỌC PHẦN (2025-2026)
// thu: 2=T2, 3=T3... 7=T7, 8=CN
// ─────────────────────────────────────────────────────────────
const LOP_HOC_PHAN_DATA = [
  // Học kỳ 1 (2025-2026)
  { ma_lop: '25S1W.1', ten: 'Nhập môn Lập trình - C1', mon_ma: 'INT1001', gv_ma: 'GV001', thu: 2, tiet_bat_dau: 1, so_tiet: 3, phong: 'A101', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  { ma_lop: '25S1W.2', ten: 'Nhập môn Lập trình - C2', mon_ma: 'INT1001', gv_ma: 'GV002', thu: 4, tiet_bat_dau: 4, so_tiet: 3, phong: 'A102', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  { ma_lop: '25S2W.1', ten: 'CTDL & Giải thuật - C1',  mon_ma: 'INT1002', gv_ma: 'GV003', thu: 3, tiet_bat_dau: 1, so_tiet: 3, phong: 'B201', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  { ma_lop: '25S3W.1', ten: 'LT Hướng đối tượng - C1', mon_ma: 'INT1003', gv_ma: 'GV004', thu: 5, tiet_bat_dau: 1, so_tiet: 3, phong: 'B202', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  { ma_lop: '25S4W.1', ten: 'Cơ sở Dữ liệu - C1',      mon_ma: 'INT2001', gv_ma: 'GV005', thu: 6, tiet_bat_dau: 4, so_tiet: 3, phong: 'C301', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  { ma_lop: '25S5W.1', ten: 'Lập trình Web - C1',      mon_ma: 'INT2003', gv_ma: 'GV001', thu: 2, tiet_bat_dau: 7, so_tiet: 3, phong: 'A103', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 1 (2025-2026)' },
  
  // Học kỳ 2 (2025-2026) - Hiện tại (tháng 3/2026)  
  { ma_lop: '26S1W.1', ten: 'Mạng máy tính - C1',       mon_ma: 'INT2002', gv_ma: 'GV001', thu: 2, tiet_bat_dau: 1, so_tiet: 3, phong: 'B101', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 2 (2025-2026)' },
  { ma_lop: '26S2W.1', ten: 'Kỹ thuật Phần mềm - C1',   mon_ma: 'INT3001', gv_ma: 'GV003', thu: 3, tiet_bat_dau: 4, so_tiet: 3, phong: 'B202', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 2 (2025-2026)' },
  { ma_lop: '26S3W.1', ten: 'Học máy - C1',             mon_ma: 'INT3002', gv_ma: 'GV004', thu: 5, tiet_bat_dau: 1, so_tiet: 3, phong: 'C301', tuan_hoc: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], hk_ten: 'Học kỳ 2 (2025-2026)' },
];

// Mapping: lớp học phần nào có lớp hành chính nào tham gia
const LHP_LHC_MAP = {
  // Học kỳ 1 (2025-2026)
  '25S1W.1': ['CNTT1-K20', 'CNTT2-K20'],
  '25S1W.2': ['CNTT1-K21', 'CNTT2-K21'],
  '25S2W.1': ['CNTT1-K20', 'CNTT1-K21'],
  '25S3W.1': ['CNTT2-K20', 'CNTT2-K21'],
  '25S4W.1': ['CNTT1-K20', 'CNTT2-K21'],
  '25S5W.1': ['CNTT1-K21', 'CNTT2-K20'],
  // Học kỳ 2 (2025-2026)
  '26S1W.1': ['CNTT1-K20', 'CNTT2-K20'],
  '26S2W.1': ['CNTT1-K21', 'CNTT2-K21'],
  '26S3W.1': ['CNTT1-K20', 'CNTT1-K21'],
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function seedAll() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Kết nối database thành công.\n');

    const {
      Khoa, ChuyenNganh, NamHoc, HocKy,
      GiangVien, TaiKhoan, MonHoc,
      LopHanhChinh, SinhVien,
      LopHocPhan, LHP_LHC, DangKyHoc
    } = db;

    // ── 1. KHOA ───────────────────────────────────────────────
    console.log('📌 Seeding Khoa...');
    const khoaMap = {};
    for (const k of KHOA_DATA) {
      const [row] = await Khoa.findOrCreate({
        where: { ma_khoa: k.ma_khoa },
        defaults: { ten_khoa: k.ten_khoa }
      });
      khoaMap[k.ma_khoa] = row.khoa_id;
      console.log(`   ${row.isNewRecord !== false ? '🆕' : '⚠️ '} Khoa: ${k.ten_khoa}`);
    }

    // ── 2. CHUYÊN NGÀNH ───────────────────────────────────────
    console.log('\n📌 Seeding ChuyenNganh...');
    const cnMap = {};
    for (const cn of CHUYEN_NGANH_DATA) {
      const [row] = await ChuyenNganh.findOrCreate({
        where: { ma_chuyennganh: cn.ma_chuyennganh },
        defaults: {
          ten_chuyennganh: cn.ten_chuyennganh,
          khoa_id: khoaMap[cn.khoa_ma]
        }
      });
      cnMap[cn.ma_chuyennganh] = row.chuyennganh_id;
      console.log(`   ✔ ${cn.ten_chuyennganh}`);
    }

    // ── 3. NĂM HỌC ───────────────────────────────────────────
    console.log('\n📌 Seeding NamHoc...');
    const namHocMap = {};
    for (const nh of NAM_HOC_DATA) {
      const [row] = await NamHoc.findOrCreate({
        where: { ten_namhoc: nh.ten_namhoc },
        defaults: { ngay_batdau: nh.ngay_batdau, ngay_ketthuc: nh.ngay_ketthuc }
      });
      namHocMap[nh.ten_namhoc] = row.namhoc_id;
      console.log(`   ✔ ${nh.ten_namhoc}`);
    }

    // ── 4. HỌC KỲ ────────────────────────────────────────────
    console.log('\n📌 Seeding HocKy...');
    const hocKyMap = {};
    for (const hk of HOC_KY_DATA) {
      const [row] = await HocKy.findOrCreate({
        where: { ten_hocky: hk.ten_hocky },
        defaults: {
          ngay_batdau: hk.ngay_batdau,
          ngay_ketthuc: hk.ngay_ketthuc,
          ngay_monday_tuan_1: hk.ngay_monday_tuan_1,
          tuan_bat_dau_co_lich: hk.tuan_bat_dau_co_lich,
          namhoc_id: namHocMap[hk.namhoc_ten]
        }
      });
      hocKyMap[hk.ten_hocky] = row.hocky_id;
      console.log(`   ✔ ${hk.ten_hocky}`);
    }

    // ── 5. GIẢNG VIÊN + TÀI KHOẢN ────────────────────────────
    console.log('\n📌 Seeding GiangVien + TaiKhoan...');
    const gvMap = {};
    for (const gv of GIANG_VIEN_DATA) {
      const [row] = await GiangVien.findOrCreate({
        where: { ma_gv: gv.ma_gv },
        defaults: {
          ho: gv.ho, ten: gv.ten,
          email: gv.email, sdt: gv.sdt,
          khoa_id: khoaMap[gv.khoa_ma]
        }
      });
      gvMap[gv.ma_gv] = row.giangvien_id;

      // Tạo tài khoản nếu chưa có
      const existing = await TaiKhoan.findOne({ where: { ref_id: row.giangvien_id, vaitro: 'giangvien' } });
      if (!existing) {
        const password_hash = await bcrypt.hash('Gv@123456', SALT_ROUNDS);
        await TaiKhoan.create({
          username: gv.ma_gv.toLowerCase(),
          password_hash,
          vaitro: 'giangvien',
          ref_id: row.giangvien_id
        });
        console.log(`   🆕 GV: ${gv.ho} ${gv.ten}  →  TK: ${gv.ma_gv.toLowerCase()} / Gv@123456`);
      } else {
        console.log(`   ⚠️  GV: ${gv.ho} ${gv.ten} (tài khoản đã tồn tại)`);
      }
    }

    // ── 6. MÔN HỌC ───────────────────────────────────────────
    console.log('\n📌 Seeding MonHoc...');
    const monMap = {};
    for (const m of MON_HOC_DATA) {
      const [row] = await MonHoc.findOrCreate({
        where: { ma_mon: m.ma_mon },
        defaults: {
          ten_mon: m.ten_mon,
          sotinchi: m.sotinchi,
          khoa_id: khoaMap[m.khoa_ma]
        }
      });
      monMap[m.ma_mon] = row.monhoc_id;
      console.log(`   ✔ ${m.ma_mon} - ${m.ten_mon}`);
    }

    // ── 7. LỚP HÀNH CHÍNH ────────────────────────────────────
    console.log('\n📌 Seeding LopHanhChinh...');
    const lhcMap = {};
    for (const lhc of LOP_HANH_CHINH_DATA) {
      const [row] = await LopHanhChinh.findOrCreate({
        where: { ten_lop: lhc.ten_lop },
        defaults: {
          nien_khoa: lhc.nien_khoa,
          khoa_id: khoaMap[lhc.khoa_ma],
          chuyennganh_id: cnMap[lhc.chuyen_nganh_ma],
          giangvien_id: gvMap[lhc.gvcn_ma]
        }
      });
      lhcMap[lhc.ten_lop] = row.lop_hanhchinh_id;
      console.log(`   ✔ ${lhc.ten_lop}`);
    }

    // ── 8. SINH VIÊN ─────────────────────────────────────────
    console.log('\n📌 Seeding SinhVien...');
    const svByLop = {};

    const lopSVConfig = [
      { ten_lop: 'CNTT1-K20', prefix: '20201', count: 6 },
      { ten_lop: 'CNTT2-K20', prefix: '20202', count: 6 },
      { ten_lop: 'CNTT1-K21', prefix: '21201', count: 6 },
      { ten_lop: 'CNTT2-K21', prefix: '21202', count: 6 },
    ];

    const HO_LIST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
    const TEN_LIST = ['An', 'Bình', 'Cường', 'Duy', 'Em', 'Phúc', 'Giang', 'Hùng', 'Khoa', 'Linh', 'Minh', 'Nam'];

    for (const cfg of lopSVConfig) {
      svByLop[cfg.ten_lop] = [];
      for (let i = 1; i <= cfg.count; i++) {
        const ma_sv = `${cfg.prefix}${String(i).padStart(3, '0')}`;
        const ho = HO_LIST[(i - 1) % HO_LIST.length];
        const ten = TEN_LIST[(i - 1) % TEN_LIST.length];
        const [sv] = await SinhVien.findOrCreate({
          where: { ma_sv },
          defaults: {
            ten: `${ho} ${ten}`,
            email: `${ma_sv}@sv.hust.edu.vn`,
            sdt: `09${cfg.prefix}${String(i).padStart(3, '0')}`.slice(0, 11),
            lop_hanhchinh_id: lhcMap[cfg.ten_lop],
            ngaysinh: `200${Math.floor(i / 5) + 2}-0${(i % 9) + 1}-15`,
            trang_thai: 'Đang học'
          }
        });
        svByLop[cfg.ten_lop].push(sv.sinhvien_id);
      }
      console.log(`   ✔ ${cfg.count} SV cho lớp ${cfg.ten_lop}`);
    }

    // ── 9. LỚP HỌC PHẦN ──────────────────────────────────────
    console.log('\n📌 Seeding LopHocPhan...');
    const lhpMap = {};
    for (const lhp of LOP_HOC_PHAN_DATA) {
      const [row] = await LopHocPhan.findOrCreate({
        where: { ma_lop: lhp.ma_lop },
        defaults: {
          ten_lophocphan: lhp.ten,
          monhoc_id: monMap[lhp.mon_ma],
          giangvien_id: gvMap[lhp.gv_ma],
          hocky_id: hocKyMap[lhp.hk_ten],
          thu: lhp.thu,
          tiet_bat_dau: lhp.tiet_bat_dau,
          so_tiet: lhp.so_tiet,
          phong: lhp.phong,
          tuan_hoc: lhp.tuan_hoc,
          loai_hoc_phan: 'LT'
        }
      });
      lhpMap[lhp.ma_lop] = row.lophocphan_id;
      console.log(`   ✔ ${lhp.ma_lop} - ${lhp.ten}`);
    }

    // ── 9b. LHP_LHC (liên kết lớp học phần ↔ lớp hành chính) ─
    console.log('\n📌 Seeding LHP_LHC...');
    for (const [maLop, danhSachLHC] of Object.entries(LHP_LHC_MAP)) {
      const lhpId = lhpMap[maLop];
      if (!lhpId) continue;
      for (const tenLHC of danhSachLHC) {
        const lhcId = lhcMap[tenLHC];
        if (!lhcId) continue;
        await LHP_LHC.findOrCreate({
          where: { lophocphan_id: lhpId, lop_hanhchinh_id: lhcId }
        });
      }
      console.log(`   ✔ ${maLop} ↔ [${danhSachLHC.join(', ')}]`);
    }

    // ── 10. ĐĂNG KÝ HỌC ──────────────────────────────────────
    console.log('\n📌 Seeding DangKyHoc...');
    let totalDK = 0;
    for (const [maLop, danhSachLHC] of Object.entries(LHP_LHC_MAP)) {
      const lhpId = lhpMap[maLop];
      if (!lhpId) continue;
      for (const tenLHC of danhSachLHC) {
        const svList = svByLop[tenLHC] || [];
        for (const svId of svList) {
          await DangKyHoc.findOrCreate({
            where: { sinhvien_id: svId, lophocphan_id: lhpId },
            defaults: { trangthai: 'active' }
          });
          totalDK++;
        }
      }
    }
    console.log(`   ✔ Tổng ${totalDK} bản ghi đăng ký học`);

    // ── TỔNG KẾT ─────────────────────────────────────────────
    console.log('\n🎉 Seed dữ liệu hoàn tất!');
    console.log('─────────────────────────────────────');
    console.log('📋 Tài khoản mẫu:');
    console.log('   Admin  : admin       / Admin@123');
    for (const gv of GIANG_VIEN_DATA) {
      console.log(`   GV     : ${gv.ma_gv.toLowerCase().padEnd(12)} / Gv@123456`);
    }
    console.log('─────────────────────────────────────');

  } catch (err) {
    console.error('❌ Lỗi khi seed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

seedAll();
