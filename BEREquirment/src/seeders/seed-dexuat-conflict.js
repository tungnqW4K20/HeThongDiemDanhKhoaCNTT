require('dotenv').config();
const db = require('../models');

const DEFAULT_CONFLICT_DATE = process.env.SEED_DEXUAT_CONFLICT_DATE || '2026-10-14';

async function findOrCreateKhoa() {
  const [khoa] = await db.Khoa.findOrCreate({
    where: { ma_khoa: 'CNTT' },
    defaults: {
      ma_khoa: 'CNTT',
      ten_khoa: 'Công nghệ thông tin',
      mota: 'Khoa CNTT cho dữ liệu test đề xuất',
      isDeleted: false,
      ngay_tao: new Date()
    }
  });
  return khoa;
}

async function findOrCreateGiangVien(khoaId, seed) {
  const [gv] = await db.GiangVien.findOrCreate({
    where: { ma_gv: seed.ma_gv },
    defaults: {
      khoa_id: khoaId,
      ma_gv: seed.ma_gv,
      ho: seed.ho,
      ten: seed.ten,
      email: seed.email,
      sdt: seed.sdt,
      ngay_tao: new Date(),
      isDeleted: false
    }
  });

  if (!gv.khoa_id) {
    await gv.update({ khoa_id: khoaId });
  }

  return gv;
}

async function findHocKyForSeed() {
  const hocKy = await db.HocKy.findOne({
    order: [['ngay_batdau', 'DESC']]
  });

  if (!hocKy) {
    throw new Error('Không tìm thấy học kỳ. Hãy chạy npm run seed:data trước.');
  }

  return hocKy;
}

async function findOrCreateMonHoc(khoaId, payload) {
  const [monHoc] = await db.MonHoc.findOrCreate({
    where: { ma_mon: payload.ma_mon },
    defaults: {
      khoa_id: khoaId,
      ma_mon: payload.ma_mon,
      ten_mon: payload.ten_mon,
      sotinchi: payload.sotinchi,
      mota: payload.mota,
      isDeleted: false
    }
  });

  return monHoc;
}

async function findOrCreateLopHanhChinh(khoaId, gv1Id) {
  const [lop] = await db.LopHanhChinh.findOrCreate({
    where: { ten_lop: 'TEST_DX_01' },
    defaults: {
      khoa_id: khoaId,
      ten_lop: 'TEST_DX_01',
      nien_khoa: 2026,
      chuong_trinh: 'Kỹ sư',
      ghichu: 'Lớp test đề xuất chỉnh sửa trùng lịch',
      giangvien_id: gv1Id,
      isDeleted: false,
      ngay_tao: new Date()
    }
  });

  return lop;
}

async function upsertLopHocPhan(payload) {
  const existing = await db.LopHocPhan.findOne({ where: { ma_lop: payload.ma_lop } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }
  return db.LopHocPhan.create(payload);
}

async function upsertBuoiHoc(payload) {
  const [buoi, created] = await db.BuoiHoc.findOrCreate({
    where: {
      lophocphan_id: payload.lophocphan_id,
      ngay: payload.ngay
    },
    defaults: payload
  });

  if (!created) {
    await buoi.update(payload);
  }

  return buoi;
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });

    const khoa = await findOrCreateKhoa();

    const gv1 = await findOrCreateGiangVien(khoa.khoa_id, {
      ma_gv: 'GV001',
      ho: 'Nguyễn Văn',
      ten: 'Thắng',
      email: 'thang.nv@utehy.edu.vn',
      sdt: '0901000001'
    });

    const gv2 = await findOrCreateGiangVien(khoa.khoa_id, {
      ma_gv: 'GV002',
      ho: 'Trần Thị',
      ten: 'Huyền',
      email: 'huyen.tt@utehy.edu.vn',
      sdt: '0901000002'
    });

    const hocKy = await findHocKyForSeed();

    const monSrc = await findOrCreateMonHoc(khoa.khoa_id, {
      ma_mon: 'TEST_DX_SRC',
      ten_mon: 'Môn nguồn đề xuất',
      sotinchi: 3,
      mota: 'Học phần dùng để tạo đề xuất test trùng lịch'
    });

    const monConflict = await findOrCreateMonHoc(khoa.khoa_id, {
      ma_mon: 'TEST_DX_CFL',
      ten_mon: 'Môn gây trùng lịch',
      sotinchi: 3,
      mota: 'Học phần đang chiếm slot của giảng viên thay thế'
    });

    const lopHanhChinh = await findOrCreateLopHanhChinh(khoa.khoa_id, gv1.giangvien_id);

    const lhpNguon = await upsertLopHocPhan({
      monhoc_id: monSrc.monhoc_id,
      giangvien_id: gv1.giangvien_id,
      hocky_id: hocKy.hocky_id,
      ten_lophocphan: 'LHP nguồn tạo đề xuất',
      ma_lop: 'TEST_DX_SOURCE_LHP',
      phong: 'P.DX.101',
      thu: 4,
      tiet_bat_dau: 7,
      so_tiet: 4,
      tuan_hoc: [1, 2, 3],
      loai_hoc_phan: 'LT'
    });

    const lhpTrung = await upsertLopHocPhan({
      monhoc_id: monConflict.monhoc_id,
      giangvien_id: gv2.giangvien_id,
      hocky_id: hocKy.hocky_id,
      ten_lophocphan: 'LHP gây trùng giảng viên',
      ma_lop: 'TEST_DX_CONFLICT_LHP',
      phong: 'P.DX.202',
      thu: 4,
      tiet_bat_dau: 7,
      so_tiet: 4,
      tuan_hoc: [1, 2, 3],
      loai_hoc_phan: 'LT'
    });

    await db.LHP_LHC.findOrCreate({
      where: {
        lophocphan_id: lhpNguon.lophocphan_id,
        lop_hanhchinh_id: lopHanhChinh.lop_hanhchinh_id
      },
      defaults: {
        lophocphan_id: lhpNguon.lophocphan_id,
        lop_hanhchinh_id: lopHanhChinh.lop_hanhchinh_id
      }
    });

    await db.LHP_LHC.findOrCreate({
      where: {
        lophocphan_id: lhpTrung.lophocphan_id,
        lop_hanhchinh_id: lopHanhChinh.lop_hanhchinh_id
      },
      defaults: {
        lophocphan_id: lhpTrung.lophocphan_id,
        lop_hanhchinh_id: lopHanhChinh.lop_hanhchinh_id
      }
    });

    const buoiNguon = await upsertBuoiHoc({
      lophocphan_id: lhpNguon.lophocphan_id,
      ngay: DEFAULT_CONFLICT_DATE,
      trangthai: 'scheduled',
      is_override: false,
      ghi_chu: 'Buổi nguồn để giảng viên GV001 gửi đề xuất',
      tiet_bat_dau: 7,
      so_tiet: 4,
      phong: 'P.DX.101',
      batdau: new Date(`${DEFAULT_CONFLICT_DATE}T13:20:00`)
    });

    const buoiTrung = await upsertBuoiHoc({
      lophocphan_id: lhpTrung.lophocphan_id,
      ngay: DEFAULT_CONFLICT_DATE,
      trangthai: 'scheduled',
      is_override: false,
      ghi_chu: 'Buổi này sẽ gây trùng khi chọn GV002 dạy thay',
      tiet_bat_dau: 7,
      so_tiet: 4,
      phong: 'P.DX.202',
      batdau: new Date(`${DEFAULT_CONFLICT_DATE}T13:20:00`)
    });

    await db.DeXuatChinhSua.destroy({
      where: {
        buoi_id: buoiNguon.buoi_id,
        nguoi_de_xuat_id: gv1.giangvien_id,
        trang_thai: 'pending'
      }
    });

    console.log('\n=== Seed test conflict đề xuất thành công ===');
    console.log(`Ngày test               : ${DEFAULT_CONFLICT_DATE}`);
    console.log(`Buổi nguồn (GV001)      : ${buoiNguon.buoi_id}`);
    console.log(`Buổi đang chiếm slot GV2: ${buoiTrung.buoi_id}`);
    console.log(`Giảng viên gửi đề xuất  : GV001 - ${gv1.ho} ${gv1.ten}`);
    console.log(`Giảng viên gây trùng    : GV002 - ${gv2.ho} ${gv2.ten} - ${gv2.sdt || 'N/A'} - ${gv2.email || 'N/A'}`);
    console.log('');
    console.log('Cách test nhanh:');
    console.log('1) Đăng nhập app bằng tài khoản gv001 / Gv@123456');
    console.log('2) Vào Đề xuất chỉnh sửa, chọn buổi nguồn ở trên');
    console.log('3) Chọn giảng viên dạy thay là GV002, giữ ngày/tiết 7-10 ngày test');
    console.log('4) Gửi đề xuất => hệ thống phải báo trùng và hiện rõ ai/buổi nào/SĐT/email');
    console.log('============================================\n');
  } catch (error) {
    console.error('Seed conflict failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
