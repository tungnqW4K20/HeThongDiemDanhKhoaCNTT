require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');
const namHocService = require('../services/namhoc.service');

const SALT_ROUNDS = 10;
const SCHOOL_YEAR = '2026-2027';

const buildDefaultHk2TargetDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  return `${y}-04-10`;
};

const HK2_TARGET_DATE = process.env.SEED_HK2_TARGET_DATE || buildDefaultHk2TargetDate();

const TIET_START_HOUR = {
  1: [7, 0],
  2: [7, 50],
  3: [9, 0],
  4: [9, 50],
  5: [10, 40],
  6: [12, 30],
  7: [13, 20],
  8: [14, 10],
  9: [15, 0],
  10: [15, 50],
  11: [16, 40],
  12: [17, 30]
};

const THU_TO_OFFSET = {
  2: 0,
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6
};

const toDateOnly = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateOnly = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const getBuoiStartDateTime = (dateOnly, tietBatDau) => {
  const [hour, minute] = TIET_START_HOUR[tietBatDau] || [7, 0];
  const start = parseDateOnly(dateOnly);
  start.setHours(hour, minute, 0, 0);
  return start;
};

async function upsertTaiKhoan({ username, password, vaitro, ref_id = null }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await db.TaiKhoan.findOne({ where: { username } });

  if (existing) {
    await existing.update({
      password_hash: passwordHash,
      vaitro,
      ref_id,
      ngay_tao: existing.ngay_tao || new Date()
    });

    return { ...existing.toJSON(), password, action: 'updated' };
  }

  const created = await db.TaiKhoan.create({
    username,
    password_hash: passwordHash,
    vaitro,
    ref_id,
    ngay_tao: new Date()
  });

  return { ...created.toJSON(), password, action: 'created' };
}

async function upsertLopHocPhan(payload) {
  const existing = await db.LopHocPhan.findOne({ where: { ma_lop: payload.ma_lop } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }
  return db.LopHocPhan.create(payload);
}

async function seedNamHoc20262027() {
  let namHoc = await db.NamHoc.findOne({ where: { ten_namhoc: SCHOOL_YEAR } });

  if (!namHoc) {
    await namHocService.createNamHoc({
      ten_namhoc: SCHOOL_YEAR,
      ngay_batdau: '2026-08-03',
      ngay_ketthuc: '2027-07-31',
      hk1_tuan_bat_dau_co_lich: 1,
      hk2_tuan_bat_dau_co_lich: 23
    });
  }

  namHoc = await db.NamHoc.findOne({
    where: { ten_namhoc: SCHOOL_YEAR },
    include: [{ model: db.HocKy, as: 'DanhSachHocKy' }]
  });

  if (!namHoc) {
    throw new Error(`Khong tim thay nam hoc ${SCHOOL_YEAR} sau khi seed.`);
  }

  const hocKys = [...(namHoc.DanhSachHocKy || [])].sort(
    (a, b) => new Date(a.ngay_batdau) - new Date(b.ngay_batdau)
  );

  if (hocKys.length < 2) {
    throw new Error('Nam hoc 2026-2027 chua co du 2 hoc ky.');
  }

  return { namHoc, hocKy1: hocKys[0], hocKy2: hocKys[1] };
}

async function seedBuoiHocChoLopHocPhan(lopHocPhan, hocKy, soBuoi = 6) {
  const thuOffset = THU_TO_OFFSET[lopHocPhan.thu] ?? 0;
  const monday = parseDateOnly(hocKy.ngay_monday_tuan_1);
  const ngayBatDauLHP = addDays(monday, thuOffset);

  const dsBuoi = [];
  for (let i = 0; i < soBuoi; i++) {
    const ngay = toDateOnly(addDays(ngayBatDauLHP, i * 7));
    const batdau = getBuoiStartDateTime(ngay, lopHocPhan.tiet_bat_dau);

    const [buoi] = await db.BuoiHoc.findOrCreate({
      where: {
        lophocphan_id: lopHocPhan.lophocphan_id,
        ngay
      },
      defaults: {
        lophocphan_id: lopHocPhan.lophocphan_id,
        ngay,
        trangthai: i < 2 ? 'completed' : 'scheduled',
        is_override: false,
        ghi_chu: i < 2 ? 'Buoi da hoc (seed 2026-2027)' : 'Buoi theo ke hoach (seed 2026-2027)',
        tiet_bat_dau: lopHocPhan.tiet_bat_dau,
        so_tiet: lopHocPhan.so_tiet,
        phong: lopHocPhan.phong,
        batdau
      }
    });

    dsBuoi.push(buoi);
  }

  return dsBuoi;
}

async function ensureHocKy2SessionOnTargetDate(lopHocPhan) {
  const [buoi] = await db.BuoiHoc.findOrCreate({
    where: {
      lophocphan_id: lopHocPhan.lophocphan_id,
      ngay: HK2_TARGET_DATE
    },
    defaults: {
      lophocphan_id: lopHocPhan.lophocphan_id,
      ngay: HK2_TARGET_DATE,
      trangthai: 'scheduled',
      is_override: true,
      ghi_chu: 'Buoi bo sung hoc ky 2 cho ngay 10/4',
      tiet_bat_dau: lopHocPhan.tiet_bat_dau,
      so_tiet: lopHocPhan.so_tiet,
      phong: lopHocPhan.phong,
      batdau: getBuoiStartDateTime(HK2_TARGET_DATE, lopHocPhan.tiet_bat_dau)
    }
  });

  return buoi;
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });

    const [coSoA] = await db.CoSo.findOrCreate({
      where: { ten_coso: 'Co so chinh' },
      defaults: {
        ten_coso: 'Co so chinh',
        dia_chi: 'Khoai Chau, Hung Yen',
        mota: 'Co so trung tam',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [coSoB] = await db.CoSo.findOrCreate({
      where: { ten_coso: 'Co so thuc hanh' },
      defaults: {
        ten_coso: 'Co so thuc hanh',
        dia_chi: 'My Hao, Hung Yen',
        mota: 'Co so thuc hanh',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [khoaCNTT] = await db.Khoa.findOrCreate({
      where: { ma_khoa: 'CNTT' },
      defaults: {
        ma_khoa: 'CNTT',
        ten_khoa: 'Cong nghe thong tin',
        mota: 'Dao tao ky su va cu nhan CNTT',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [khoaDTVT] = await db.Khoa.findOrCreate({
      where: { ma_khoa: 'DTVT' },
      defaults: {
        ma_khoa: 'DTVT',
        ten_khoa: 'Dien - Dien tu',
        mota: 'Dao tao linh vuc dien, dien tu va tu dong hoa',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [cnpm] = await db.ChuyenNganh.findOrCreate({
      where: { ma_chuyennganh: 'CNPM' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_chuyennganh: 'CNPM',
        ten_chuyennganh: 'Cong nghe phan mem',
        mota: 'Nhom mon phat trien phan mem',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [mmt] = await db.ChuyenNganh.findOrCreate({
      where: { ma_chuyennganh: 'MMT' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_chuyennganh: 'MMT',
        ten_chuyennganh: 'Mang may tinh',
        mota: 'Nhom mon he thong mang va ATTT',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [boMonCNPM] = await db.BoMon.findOrCreate({
      where: { ma_bomon: 'CNPM' },
      defaults: {
        bomon_id: cnpm.chuyennganh_id,
        khoa_id: khoaCNTT.khoa_id,
        ma_bomon: 'CNPM',
        ten_bomon: 'Cong nghe phan mem',
        mota: 'Bo mon CNPM',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [boMonMMT] = await db.BoMon.findOrCreate({
      where: { ma_bomon: 'MMT' },
      defaults: {
        bomon_id: mmt.chuyennganh_id,
        khoa_id: khoaCNTT.khoa_id,
        ma_bomon: 'MMT',
        ten_bomon: 'Mang may tinh',
        mota: 'Bo mon MMT',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [gv1] = await db.GiangVien.findOrCreate({
      where: { ma_gv: 'GV001' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_gv: 'GV001',
        ho: 'Nguyen Van',
        ten: 'Thang',
        email: 'thang.nv@utehy.edu.vn',
        sdt: '0901000001',
        ngay_tao: new Date(),
        isDeleted: false
      }
    });

    const [gv2] = await db.GiangVien.findOrCreate({
      where: { ma_gv: 'GV002' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_gv: 'GV002',
        ho: 'Tran Thi',
        ten: 'Huyen',
        email: 'huyen.tt@utehy.edu.vn',
        sdt: '0901000002',
        ngay_tao: new Date(),
        isDeleted: false
      }
    });

    const [gv3] = await db.GiangVien.findOrCreate({
      where: { ma_gv: 'GV003' },
      defaults: {
        khoa_id: khoaDTVT.khoa_id,
        ma_gv: 'GV003',
        ho: 'Pham Minh',
        ten: 'Duc',
        email: 'duc.pm@utehy.edu.vn',
        sdt: '0901000003',
        ngay_tao: new Date(),
        isDeleted: false
      }
    });

    const adminAccount = await upsertTaiKhoan({
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
      vaitro: process.env.SEED_ADMIN_ROLE || 'admin'
    });

    const lanhDaoAccount = await upsertTaiKhoan({
      username: process.env.SEED_MANAGER_USERNAME || 'lanhdao',
      password: process.env.SEED_MANAGER_PASSWORD || 'LanhDao@123',
      vaitro: 'lanhdao'
    });

    const gvAccount1 = await upsertTaiKhoan({
      username: process.env.SEED_GV_USERNAME || 'gv001',
      password: process.env.SEED_GV_PASSWORD || 'Gv@123456',
      vaitro: 'giangvien',
      ref_id: gv1.giangvien_id
    });

    const gvAccount2 = await upsertTaiKhoan({
      username: 'gv002',
      password: 'Gv@123456',
      vaitro: 'giangvien',
      ref_id: gv2.giangvien_id
    });

    const truongBoMonAccount = await upsertTaiKhoan({
      username: process.env.SEED_TBM_USERNAME || 'truongbomon',
      password: process.env.SEED_TBM_PASSWORD || 'TruongBoMon@123',
      vaitro: 'truongbomon',
      ref_id: gv1.giangvien_id
    });

    await boMonCNPM.update({ truong_bomon_id: truongBoMonAccount.taikhoan_id });

    const { namHoc, hocKy1, hocKy2 } = await seedNamHoc20262027();

    const [monCSDL] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1306' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: cnpm.chuyennganh_id,
        bomon_id: boMonCNPM.bomon_id,
        ma_mon: 'INT1306',
        ten_mon: 'Co so du lieu',
        sotinchi: 3,
        mota: 'Mon hoc nen tang CSDL',
        isDeleted: false
      }
    });

    const [monWeb] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1338' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: cnpm.chuyennganh_id,
        bomon_id: boMonCNPM.bomon_id,
        ma_mon: 'INT1338',
        ten_mon: 'Lap trinh Web',
        sotinchi: 3,
        mota: 'Mon hoc xay dung ung dung web',
        isDeleted: false
      }
    });

    const [monCTDL] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1322' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: mmt.chuyennganh_id,
        bomon_id: boMonMMT.bomon_id,
        ma_mon: 'INT1322',
        ten_mon: 'Cau truc du lieu va giai thuat',
        sotinchi: 4,
        mota: 'Mon hoc giai thuat nen tang',
        isDeleted: false
      }
    });

    if (!monCSDL.bomon_id) await monCSDL.update({ bomon_id: boMonCNPM.bomon_id, chuyennganh_id: cnpm.chuyennganh_id });
    if (!monWeb.bomon_id) await monWeb.update({ bomon_id: boMonCNPM.bomon_id, chuyennganh_id: cnpm.chuyennganh_id });
    if (!monCTDL.bomon_id) await monCTDL.update({ bomon_id: boMonMMT.bomon_id, chuyennganh_id: mmt.chuyennganh_id });

    const [lop1] = await db.LopHanhChinh.findOrCreate({
      where: { ten_lop: '12626TN' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ten_lop: '12626TN',
        nien_khoa: 2026,
        chuong_trinh: 'Ky su',
        ghichu: 'Lop CNPM khoa 2026',
        giangvien_id: gv1.giangvien_id,
        coso_id: coSoA.coso_id,
        chuyennganh_id: cnpm.chuyennganh_id,
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [lop2] = await db.LopHanhChinh.findOrCreate({
      where: { ten_lop: '12626MMT' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ten_lop: '12626MMT',
        nien_khoa: 2026,
        chuong_trinh: 'Cu nhan',
        ghichu: 'Lop MMT khoa 2026',
        giangvien_id: gv2.giangvien_id,
        coso_id: coSoB.coso_id,
        chuyennganh_id: mmt.chuyennganh_id,
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const sinhVienData = [
      { ma_sv: 'SV260001', ten: 'Nguyen Hai Dang', email: 'sv260001@st.utehy.edu.vn', sdt: '0988100001', lop_hanhchinh_id: lop1.lop_hanhchinh_id, ngaysinh: '2008-01-15', trang_thai: 'Dang hoc' },
      { ma_sv: 'SV260002', ten: 'Tran Minh Duc', email: 'sv260002@st.utehy.edu.vn', sdt: '0988100002', lop_hanhchinh_id: lop1.lop_hanhchinh_id, ngaysinh: '2008-03-21', trang_thai: 'Dang hoc' },
      { ma_sv: 'SV260003', ten: 'Le Thi Ngan', email: 'sv260003@st.utehy.edu.vn', sdt: '0988100003', lop_hanhchinh_id: lop1.lop_hanhchinh_id, ngaysinh: '2008-07-11', trang_thai: 'Canh bao' },
      { ma_sv: 'SV260101', ten: 'Pham Gia Bao', email: 'sv260101@st.utehy.edu.vn', sdt: '0988100101', lop_hanhchinh_id: lop2.lop_hanhchinh_id, ngaysinh: '2008-02-19', trang_thai: 'Dang hoc' },
      { ma_sv: 'SV260102', ten: 'Do Hoang Nam', email: 'sv260102@st.utehy.edu.vn', sdt: '0988100102', lop_hanhchinh_id: lop2.lop_hanhchinh_id, ngaysinh: '2008-06-30', trang_thai: 'Bao luu' },
      { ma_sv: 'SV260103', ten: 'Vu Quoc Huy', email: 'sv260103@st.utehy.edu.vn', sdt: '0988100103', lop_hanhchinh_id: lop2.lop_hanhchinh_id, ngaysinh: '2008-11-05', trang_thai: 'Dang hoc' }
    ];

    const sinhViens = [];
    for (const sv of sinhVienData) {
      const [createdSV] = await db.SinhVien.findOrCreate({
        where: { ma_sv: sv.ma_sv },
        defaults: {
          ...sv,
          isDeleted: false,
          ngay_tao: new Date()
        }
      });
      sinhViens.push(createdSV);
    }

    const lhp1 = await upsertLopHocPhan({
      monhoc_id: monCSDL.monhoc_id,
      giangvien_id: gv1.giangvien_id,
      hocky_id: hocKy1.hocky_id,
      ten_lophocphan: 'Co so du lieu - 12626TN',
      ma_lop: 'INT1306_12626TN_2627',
      phong: 'PH205',
      thu: 2,
      tiet_bat_dau: 1,
      so_tiet: 4,
      tuan_hoc: Array.from({ length: 15 }, (_, i) => i + 1),
      loai_hoc_phan: 'LT'
    });

    const lhp2 = await upsertLopHocPhan({
      monhoc_id: monWeb.monhoc_id,
      giangvien_id: gv2.giangvien_id,
      hocky_id: hocKy1.hocky_id,
      ten_lophocphan: 'Lap trinh Web - 12626MMT',
      ma_lop: 'INT1338_12626MMT_2627',
      phong: 'LAB302',
      thu: 4,
      tiet_bat_dau: 7,
      so_tiet: 4,
      tuan_hoc: Array.from({ length: 12 }, (_, i) => i + 1),
      loai_hoc_phan: 'TH'
    });

    const lhp3 = await upsertLopHocPhan({
      monhoc_id: monCTDL.monhoc_id,
      giangvien_id: gv1.giangvien_id,
      hocky_id: hocKy2.hocky_id,
      ten_lophocphan: 'CTDL&GT - Lop ghep 12626TN + 12626MMT',
      ma_lop: 'INT1322_GHEP_12626_2627',
      phong: 'PH301',
      thu: 6,
      tiet_bat_dau: 1,
      so_tiet: 4,
      tuan_hoc: Array.from({ length: 10 }, (_, i) => i + 23),
      loai_hoc_phan: 'LT'
    });

    const lhpLinks = [
      { lophocphan_id: lhp1.lophocphan_id, lop_hanhchinh_id: lop1.lop_hanhchinh_id },
      { lophocphan_id: lhp2.lophocphan_id, lop_hanhchinh_id: lop2.lop_hanhchinh_id },
      { lophocphan_id: lhp3.lophocphan_id, lop_hanhchinh_id: lop1.lop_hanhchinh_id },
      { lophocphan_id: lhp3.lophocphan_id, lop_hanhchinh_id: lop2.lop_hanhchinh_id }
    ];

    for (const link of lhpLinks) {
      await db.LHP_LHC.findOrCreate({ where: link, defaults: link });
    }

    const dangKyMap = [
      { lhp: lhp1, lopId: lop1.lop_hanhchinh_id },
      { lhp: lhp2, lopId: lop2.lop_hanhchinh_id },
      { lhp: lhp3, lopId: lop1.lop_hanhchinh_id },
      { lhp: lhp3, lopId: lop2.lop_hanhchinh_id }
    ];

    for (const item of dangKyMap) {
      const dsSV = sinhViens.filter((sv) => sv.lop_hanhchinh_id === item.lopId);
      for (const sv of dsSV) {
        await db.DangKyHoc.findOrCreate({
          where: {
            sinhvien_id: sv.sinhvien_id,
            lophocphan_id: item.lhp.lophocphan_id
          },
          defaults: {
            sinhvien_id: sv.sinhvien_id,
            lophocphan_id: item.lhp.lophocphan_id,
            ngay_dangky: new Date(),
            trangthai: 'active'
          }
        });
      }
    }

    const buoiLhp1 = await seedBuoiHocChoLopHocPhan(lhp1, hocKy1, 6);
    const buoiLhp2 = await seedBuoiHocChoLopHocPhan(lhp2, hocKy1, 6);
    const buoiLhp3 = await seedBuoiHocChoLopHocPhan(lhp3, hocKy2, 6);
    const hk2TargetSession = await ensureHocKy2SessionOnTargetDate(lhp3);
    const allBuoiHoc = [...buoiLhp1, ...buoiLhp2, ...buoiLhp3, hk2TargetSession];

    for (const lhp of [lhp1, lhp2, lhp3]) {
      const buoiCompleted = await db.BuoiHoc.findAll({
        where: { lophocphan_id: lhp.lophocphan_id, trangthai: 'completed' },
        order: [['ngay', 'ASC']],
        limit: 2
      });

      const svDangKy = await db.DangKyHoc.findAll({
        where: { lophocphan_id: lhp.lophocphan_id, trangthai: 'active' }
      });

      for (const buoi of buoiCompleted) {
        for (let i = 0; i < svDangKy.length; i++) {
          const dk = svDangKy[i];
          const trangthai = i % 6 === 0 ? 'absent' : (i % 4 === 0 ? 'late' : 'present');

          await db.DiemDanh.findOrCreate({
            where: { buoi_id: buoi.buoi_id, sinhvien_id: dk.sinhvien_id },
            defaults: {
              buoi_id: buoi.buoi_id,
              sinhvien_id: dk.sinhvien_id,
              trangthai,
              ghichu: 'Seed diem danh 2026-2027',
              thoigian_danhdau: new Date()
            }
          });
        }
      }
    }

    const buoiMau = allBuoiHoc.find((b) => b.trangthai === 'completed');
    if (buoiMau) {
      const existingPending = await db.DeXuatChinhSua.findOne({
        where: {
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv1.giangvien_id,
          trang_thai: 'pending'
        }
      });

      if (!existingPending) {
        await db.DeXuatChinhSua.create({
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv1.giangvien_id,
          ngay_moi: buoiMau.ngay,
          tiet_bat_dau_moi: buoiMau.tiet_bat_dau || 1,
          so_tiet_moi: buoiMau.so_tiet || 4,
          phong_moi: 'PH207',
          ly_do: 'De xuat doi phong do trung lich su dung phong.',
          loai_de_xuat: 'chinh_sua',
          trang_thai: 'pending'
        });
      }
    }

    await db.NgayNghi.findOrCreate({
      where: { ngay: '2026-09-02' },
      defaults: {
        ngay: '2026-09-02',
        mo_ta: 'Nghi le Quoc khanh',
        loai: 'le'
      }
    });

    await db.NgayNghi.findOrCreate({
      where: { ngay: '2027-02-16' },
      defaults: {
        ngay: '2027-02-16',
        mo_ta: 'Nghi Tet Nguyen dan',
        loai: 'tet'
      }
    });

    const hkIds = [hocKy1.hocky_id, hocKy2.hocky_id];
    const lhpIds = [lhp1.lophocphan_id, lhp2.lophocphan_id, lhp3.lophocphan_id];
    const buoiIds = allBuoiHoc.map((b) => b.buoi_id);

    const thongKe = {
      CoSo: await db.CoSo.count(),
      Khoa: await db.Khoa.count(),
      ChuyenNganh: await db.ChuyenNganh.count(),
      BoMon: await db.BoMon.count(),
      GiangVien: await db.GiangVien.count(),
      TaiKhoan: await db.TaiKhoan.count(),
      NamHoc: await db.NamHoc.count(),
      HocKy: await db.HocKy.count({ where: { namhoc_id: namHoc.namhoc_id } }),
      MonHoc: await db.MonHoc.count(),
      LopHanhChinh: await db.LopHanhChinh.count({ where: { ten_lop: ['12626TN', '12626MMT'] } }),
      SinhVien: await db.SinhVien.count({ where: { ma_sv: { [db.Sequelize.Op.like]: 'SV26%' } } }),
      LopHocPhan: await db.LopHocPhan.count({ where: { hocky_id: hkIds } }),
      LHP_LHC: await db.LHP_LHC.count({ where: { lophocphan_id: lhpIds } }),
      DangKyHoc: await db.DangKyHoc.count({ where: { lophocphan_id: lhpIds } }),
      BuoiHoc: await db.BuoiHoc.count({ where: { lophocphan_id: lhpIds } }),
      DiemDanh: await db.DiemDanh.count({ where: { buoi_id: buoiIds } }),
      DeXuatChinhSua: await db.DeXuatChinhSua.count({ where: { buoi_id: buoiIds } }),
      NgayNghi: await db.NgayNghi.count({ where: { ngay: ['2026-09-02', '2027-02-16'] } })
    };

    console.log('\n=== Seed du lieu nam hoc 2026-2027 thanh cong ===');
    console.log(`Nam hoc : ${namHoc.ten_namhoc}`);
    console.log(`Hoc ky  : ${hocKy1.ten_hocky} | ${hocKy2.ten_hocky}`);
    console.log(`HK2 test ngay 10/4: ${HK2_TARGET_DATE} (${hk2TargetSession.buoi_id})`);
    console.log(`Admin   : ${adminAccount.username} / ${adminAccount.password} (${adminAccount.action})`);
    console.log(`Lanh dao: ${lanhDaoAccount.username} / ${lanhDaoAccount.password} (${lanhDaoAccount.action})`);
    console.log(`GV001   : ${gvAccount1.username} / ${gvAccount1.password} (${gvAccount1.action})`);
    console.log(`GV002   : ${gvAccount2.username} / ${gvAccount2.password} (${gvAccount2.action})`);
    console.log(`TBM     : ${truongBoMonAccount.username} / ${truongBoMonAccount.password} (${truongBoMonAccount.action})`);

    Object.entries(thongKe).forEach(([table, count]) => {
      console.log(`${table.padEnd(14, ' ')}: ${count}`);
    });
    console.log('=================================================\n');
  } catch (error) {
    console.error('Seed data 2026-2027 failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
