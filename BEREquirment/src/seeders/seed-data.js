require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');
const namHocService = require('../services/namhoc.service');

const SALT_ROUNDS = 10;

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
  const startInfo = TIET_START_HOUR[tietBatDau] || [7, 0];
  const start = parseDateOnly(dateOnly);
  start.setHours(startInfo[0], startInfo[1], 0, 0);
  return start;
};

async function upsertTaiKhoan({ username, password, vaitro, ref_id = null }) {
  if (!username || !password || !vaitro) {
    throw new Error('Thiếu thông tin tài khoản để seed.');
  }

  if (!['admin', 'lanhdao', 'giangvien'].includes(vaitro)) {
    throw new Error("Vai trò seed không hợp lệ. Chỉ nhận: admin, lanhdao, giangvien.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const existing = await db.TaiKhoan.findOne({ where: { username } });

  if (existing) {
    await existing.update({
      password_hash: passwordHash,
      vaitro,
      ref_id,
      ngay_tao: existing.ngay_tao || new Date()
    });

    return {
      username,
      password,
      vaitro,
      action: 'updated',
      taikhoan_id: existing.taikhoan_id
    };
  }

  const created = await db.TaiKhoan.create({
    username,
    password_hash: passwordHash,
    vaitro,
    ref_id,
    ngay_tao: new Date()
  });

  return {
    username,
    password,
    vaitro,
    action: 'created',
    taikhoan_id: created.taikhoan_id
  };
}

async function seedNamHocVaHocKy() {
  const namHocConfigs = [
    {
      ten_namhoc: process.env.SEED_NAMHOC || '2026-2027',
      ngay_batdau: process.env.SEED_NAMHOC_START || '2026-08-03',
      ngay_ketthuc: process.env.SEED_NAMHOC_END || '2027-07-31',
      hk1_tuan_bat_dau_co_lich: Number(process.env.SEED_HK1_WEEK_START || 1),
      hk2_tuan_bat_dau_co_lich: Number(process.env.SEED_HK2_WEEK_START || 23)
    },
    {
      ten_namhoc: '2025-2026',
      ngay_batdau: '2025-08-04',
      ngay_ketthuc: '2026-07-31',
      hk1_tuan_bat_dau_co_lich: 1,
      hk2_tuan_bat_dau_co_lich: 23
    }
  ];

  const logs = [];

  for (const cfg of namHocConfigs) {
    const existing = await db.NamHoc.findOne({ where: { ten_namhoc: cfg.ten_namhoc } });
    if (!existing) {
      await namHocService.createNamHoc(cfg);
      logs.push(`${cfg.ten_namhoc} (created)`);
    } else {
      logs.push(`${cfg.ten_namhoc} (existing)`);
    }
  }

  const namHocHienTai = await db.NamHoc.findOne({
    where: { ten_namhoc: process.env.SEED_NAMHOC || '2026-2027' },
    include: [{ model: db.HocKy, as: 'DanhSachHocKy' }]
  });

  if (!namHocHienTai) {
    throw new Error('Không tìm thấy năm học hiện tại sau khi seed.');
  }

  const hocKys = [...(namHocHienTai.DanhSachHocKy || [])].sort(
    (a, b) => new Date(a.ngay_batdau) - new Date(b.ngay_batdau)
  );

  return { namHocHienTai, hocKys, logs };
}

async function upsertLopHocPhan(payload) {
  const existing = await db.LopHocPhan.findOne({ where: { ma_lop: payload.ma_lop } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }
  return db.LopHocPhan.create(payload);
}

async function seedBuoiHocChoLopHocPhan(lopHocPhan, soBuoi = 5) {
  const thuOffset = THU_TO_OFFSET[lopHocPhan.thu] ?? 0;
  const monday = parseDateOnly(lopHocPhan.HocKy.ngay_monday_tuan_1);
  const ngayBatDauLHP = addDays(monday, thuOffset);

  const buoiList = [];

  for (let i = 0; i < soBuoi; i++) {
    const ngay = toDateOnly(addDays(ngayBatDauLHP, i * 7));
    const batdau = getBuoiStartDateTime(ngay, lopHocPhan.tiet_bat_dau);

    const [buoiHoc] = await db.BuoiHoc.findOrCreate({
      where: {
        lophocphan_id: lopHocPhan.lophocphan_id,
        ngay
      },
      defaults: {
        lophocphan_id: lopHocPhan.lophocphan_id,
        ngay,
        trangthai: i === 0 ? 'completed' : 'scheduled',
        is_override: false,
        ghi_chu: i === 0 ? 'Buổi đã diễn ra' : 'Buổi học theo kế hoạch',
        tiet_bat_dau: lopHocPhan.tiet_bat_dau,
        so_tiet: lopHocPhan.so_tiet,
        phong: lopHocPhan.phong,
        batdau
      }
    });

    buoiList.push(buoiHoc);
  }

  return buoiList;
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });

    const [coSoA] = await db.CoSo.findOrCreate({
      where: { ten_coso: 'Cơ sở chính' },
      defaults: {
        ten_coso: 'Cơ sở chính',
        dia_chi: 'Khoái Châu, Hưng Yên',
        mota: 'Cơ sở trung tâm của trường',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [coSoB] = await db.CoSo.findOrCreate({
      where: { ten_coso: 'Cơ sở thực hành' },
      defaults: {
        ten_coso: 'Cơ sở thực hành',
        dia_chi: 'Mỹ Hào, Hưng Yên',
        mota: 'Cơ sở phục vụ học phần thực hành',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [khoaCNTT] = await db.Khoa.findOrCreate({
      where: { ma_khoa: 'CNTT' },
      defaults: {
        ma_khoa: 'CNTT',
        ten_khoa: 'Công nghệ thông tin',
        mota: 'Đào tạo kỹ sư và cử nhân CNTT',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [khoaDien] = await db.Khoa.findOrCreate({
      where: { ma_khoa: 'DTVT' },
      defaults: {
        ma_khoa: 'DTVT',
        ten_khoa: 'Điện - Điện tử',
        mota: 'Đào tạo lĩnh vực điện, điện tử và tự động hóa',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [cnPM] = await db.ChuyenNganh.findOrCreate({
      where: { ma_chuyennganh: 'CNPM' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_chuyennganh: 'CNPM',
        ten_chuyennganh: 'Công nghệ phần mềm',
        mota: 'Chuyên ngành phát triển phần mềm',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [mangMayTinh] = await db.ChuyenNganh.findOrCreate({
      where: { ma_chuyennganh: 'MMT' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_chuyennganh: 'MMT',
        ten_chuyennganh: 'Mạng máy tính',
        mota: 'Chuyên ngành hệ thống mạng và an toàn thông tin',
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [gv1] = await db.GiangVien.findOrCreate({
      where: { ma_gv: 'GV001' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ma_gv: 'GV001',
        ho: 'Nguyễn Văn',
        ten: 'Thắng',
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
        ho: 'Trần Thị',
        ten: 'Huyền',
        email: 'huyen.tt@utehy.edu.vn',
        sdt: '0901000002',
        ngay_tao: new Date(),
        isDeleted: false
      }
    });

    const [gv3] = await db.GiangVien.findOrCreate({
      where: { ma_gv: 'GV003' },
      defaults: {
        khoa_id: khoaDien.khoa_id,
        ma_gv: 'GV003',
        ho: 'Phạm Minh',
        ten: 'Đức',
        email: 'duc.pm@utehy.edu.vn',
        sdt: '0901000003',
        ngay_tao: new Date(),
        isDeleted: false
      }
    });

    if (!gv1.khoa_id) await gv1.update({ khoa_id: khoaCNTT.khoa_id });
    if (!gv2.khoa_id) await gv2.update({ khoa_id: khoaCNTT.khoa_id });
    if (!gv3.khoa_id) await gv3.update({ khoa_id: khoaDien.khoa_id });

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

    const { hocKys, logs: namHocSeedLogs } = await seedNamHocVaHocKy();

    const hocKy1 = hocKys[0];
    const hocKy2 = hocKys[1];

    if (!hocKy1 || !hocKy2) {
      throw new Error('Không tìm thấy đủ 2 học kỳ của năm học hiện tại để seed tiếp.');
    }

    const [monCSDL] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1306' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: cnPM.chuyennganh_id,
        ma_mon: 'INT1306',
        ten_mon: 'Cơ sở dữ liệu',
        sotinchi: 3,
        mota: 'Môn học nền tảng về hệ quản trị cơ sở dữ liệu',
        isDeleted: false
      }
    });

    const [monWeb] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1338' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: cnPM.chuyennganh_id,
        ma_mon: 'INT1338',
        ten_mon: 'Lập trình Web',
        sotinchi: 3,
        mota: 'Môn học xây dựng ứng dụng web',
        isDeleted: false
      }
    });

    const [monCTDL] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'INT1322' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        chuyennganh_id: mangMayTinh.chuyennganh_id,
        ma_mon: 'INT1322',
        ten_mon: 'Cấu trúc dữ liệu và giải thuật',
        sotinchi: 4,
        mota: 'Môn học giải thuật nền tảng',
        isDeleted: false
      }
    });

    if (!monCSDL.chuyennganh_id) await monCSDL.update({ chuyennganh_id: cnPM.chuyennganh_id });
    if (!monWeb.chuyennganh_id) await monWeb.update({ chuyennganh_id: cnPM.chuyennganh_id });
    if (!monCTDL.chuyennganh_id) await monCTDL.update({ chuyennganh_id: mangMayTinh.chuyennganh_id });

    const [lop1] = await db.LopHanhChinh.findOrCreate({
      where: { ten_lop: '12422TN' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ten_lop: '12422TN',
        nien_khoa: 2024,
        chuong_trinh: 'Kỹ sư',
        ghichu: 'Lớp Công nghệ phần mềm khóa 2024',
        giangvien_id: gv1.giangvien_id,
        coso_id: coSoA.coso_id,
        chuyennganh_id: cnPM.chuyennganh_id,
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const [lop2] = await db.LopHanhChinh.findOrCreate({
      where: { ten_lop: '12524W.3' },
      defaults: {
        khoa_id: khoaCNTT.khoa_id,
        ten_lop: '12524W.3',
        nien_khoa: 2025,
        chuong_trinh: 'Cử nhân',
        ghichu: 'Lớp Mạng máy tính khóa 2025',
        giangvien_id: gv2.giangvien_id,
        coso_id: coSoB.coso_id,
        chuyennganh_id: mangMayTinh.chuyennganh_id,
        isDeleted: false,
        ngay_tao: new Date()
      }
    });

    const sinhVienData = [
      {
        ma_sv: 'SV240001',
        ten: 'Nguyễn Tuấn Anh',
        email: 'sv240001@st.utehy.edu.vn',
        sdt: '0988000001',
        lop_hanhchinh_id: lop1.lop_hanhchinh_id,
        ngaysinh: '2006-01-15',
        trang_thai: 'Đang học'
      },
      {
        ma_sv: 'SV240002',
        ten: 'Trần Minh Châu',
        email: 'sv240002@st.utehy.edu.vn',
        sdt: '0988000002',
        lop_hanhchinh_id: lop1.lop_hanhchinh_id,
        ngaysinh: '2006-03-20',
        trang_thai: 'Đang học'
      },
      {
        ma_sv: 'SV240003',
        ten: 'Lê Nhật Quang',
        email: 'sv240003@st.utehy.edu.vn',
        sdt: '0988000003',
        lop_hanhchinh_id: lop1.lop_hanhchinh_id,
        ngaysinh: '2006-05-10',
        trang_thai: 'Cảnh báo'
      },
      {
        ma_sv: 'SV250001',
        ten: 'Phạm Gia Hân',
        email: 'sv250001@st.utehy.edu.vn',
        sdt: '0988000101',
        lop_hanhchinh_id: lop2.lop_hanhchinh_id,
        ngaysinh: '2007-02-11',
        trang_thai: 'Đang học'
      },
      {
        ma_sv: 'SV250002',
        ten: 'Đỗ Hoàng Long',
        email: 'sv250002@st.utehy.edu.vn',
        sdt: '0988000102',
        lop_hanhchinh_id: lop2.lop_hanhchinh_id,
        ngaysinh: '2007-06-21',
        trang_thai: 'Bảo lưu'
      }
    ];

    const sinhViens = [];
    for (const sv of sinhVienData) {
      const [sinhVien] = await db.SinhVien.findOrCreate({
        where: { ma_sv: sv.ma_sv },
        defaults: {
          ...sv,
          isDeleted: false,
          ngay_tao: new Date()
        }
      });
      sinhViens.push(sinhVien);
    }

    const lhp1 = await upsertLopHocPhan({
      monhoc_id: monCSDL.monhoc_id,
      giangvien_id: gv1.giangvien_id,
      hocky_id: hocKy1.hocky_id,
      ten_lophocphan: 'Cơ sở dữ liệu - 12422TN',
      ma_lop: 'INT1306_12422TN',
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
      ten_lophocphan: 'Lập trình Web - 12524W.3',
      ma_lop: 'INT1338_12524W3',
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
      ten_lophocphan: 'CTDL&GT - 12422TN + 12524W.3',
      ma_lop: 'INT1322_GHEP_2425',
      phong: 'PH301',
      thu: 6,
      tiet_bat_dau: 1,
      so_tiet: 4,
      tuan_hoc: Array.from({ length: 10 }, (_, i) => i + 23),
      loai_hoc_phan: 'LT'
    });

    const fullLinks = [
      { lophocphan_id: lhp1.lophocphan_id, lop_hanhchinh_id: lop1.lop_hanhchinh_id },
      { lophocphan_id: lhp2.lophocphan_id, lop_hanhchinh_id: lop2.lop_hanhchinh_id },
      { lophocphan_id: lhp3.lophocphan_id, lop_hanhchinh_id: lop1.lop_hanhchinh_id },
      { lophocphan_id: lhp3.lophocphan_id, lop_hanhchinh_id: lop2.lop_hanhchinh_id }
    ];

    for (const link of fullLinks) {
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

    const lhpWithHocKy = await db.LopHocPhan.findAll({
      where: { lophocphan_id: [lhp1.lophocphan_id, lhp2.lophocphan_id, lhp3.lophocphan_id] },
      include: [{ model: db.HocKy }]
    });

    const allBuoiHoc = [];
    for (const lhp of lhpWithHocKy) {
      const dsBuoi = await seedBuoiHocChoLopHocPhan(lhp, 5);
      allBuoiHoc.push(...dsBuoi);
    }

    const buoiMau = allBuoiHoc[0];

    if (buoiMau) {
      const svDangKy = await db.DangKyHoc.findAll({
        where: {
          lophocphan_id: buoiMau.lophocphan_id,
          trangthai: 'active'
        },
        limit: 3
      });

      const trangThaiDD = ['present', 'late', 'absent'];
      for (let i = 0; i < svDangKy.length; i++) {
        const dk = svDangKy[i];
        await db.DiemDanh.findOrCreate({
          where: {
            buoi_id: buoiMau.buoi_id,
            sinhvien_id: dk.sinhvien_id
          },
          defaults: {
            buoi_id: buoiMau.buoi_id,
            sinhvien_id: dk.sinhvien_id,
            trangthai: trangThaiDD[i] || 'present',
            ghichu: i === 2 ? 'Vắng có phép' : 'Điểm danh seed',
            thoigian_danhdau: new Date()
          }
        });
      }

      const deXuatPending = await db.DeXuatChinhSua.findOne({
        where: {
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv1.giangvien_id,
          trang_thai: 'pending'
        }
      });

      if (!deXuatPending) {
        await db.DeXuatChinhSua.create({
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv1.giangvien_id,
          ngay_moi: buoiMau.ngay,
          tiet_bat_dau_moi: buoiMau.tiet_bat_dau || 1,
          so_tiet_moi: buoiMau.so_tiet || 4,
          phong_moi: 'PH207',
          ly_do: 'Đề xuất đổi phòng do trùng lịch sử dụng phòng.',
          loai_de_xuat: 'chinh_sua',
          trang_thai: 'pending'
        });
      }

      const deXuatApproved = await db.DeXuatChinhSua.findOne({
        where: {
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv2.giangvien_id,
          trang_thai: 'approved'
        }
      });

      if (!deXuatApproved) {
        await db.DeXuatChinhSua.create({
          buoi_id: buoiMau.buoi_id,
          nguoi_de_xuat_id: gv2.giangvien_id,
          ngay_moi: buoiMau.ngay,
          tiet_bat_dau_moi: buoiMau.tiet_bat_dau || 1,
          so_tiet_moi: buoiMau.so_tiet || 4,
          phong_moi: 'PH305',
          ly_do: 'Đề xuất dạy thay do giảng viên chính bận công tác.',
          loai_de_xuat: 'chinh_sua',
          trang_thai: 'approved',
          phan_hoi_admin: 'Đã phê duyệt theo đề xuất hợp lý.',
          nguoi_duyet_id: adminAccount.taikhoan_id,
          giangvien_day_thay_moi_id: gv2.giangvien_id
        });
      }
    }

    await db.NgayNghi.findOrCreate({
      where: { ngay: '2026-09-02' },
      defaults: {
        ngay: '2026-09-02',
        mo_ta: 'Nghỉ lễ Quốc khánh',
        loai: 'le'
      }
    });

    await db.NgayNghi.findOrCreate({
      where: { ngay: '2027-02-10' },
      defaults: {
        ngay: '2027-02-10',
        mo_ta: 'Nghỉ Tết Nguyên đán',
        loai: 'tet'
      }
    });

    const thongKe = {
      CoSo: await db.CoSo.count(),
      Khoa: await db.Khoa.count(),
      ChuyenNganh: await db.ChuyenNganh.count(),
      GiangVien: await db.GiangVien.count(),
      TaiKhoan: await db.TaiKhoan.count(),
      NamHoc: await db.NamHoc.count(),
      HocKy: await db.HocKy.count(),
      MonHoc: await db.MonHoc.count(),
      LopHanhChinh: await db.LopHanhChinh.count(),
      SinhVien: await db.SinhVien.count(),
      LopHocPhan: await db.LopHocPhan.count(),
      LHP_LHC: await db.LHP_LHC.count(),
      DangKyHoc: await db.DangKyHoc.count(),
      BuoiHoc: await db.BuoiHoc.count(),
      DiemDanh: await db.DiemDanh.count(),
      DeXuatChinhSua: await db.DeXuatChinhSua.count(),
      NgayNghi: await db.NgayNghi.count()
    };

    console.log('\n=== Seed dữ liệu đầy đủ thành công ===');
    console.log(`Năm học xử lý: ${namHocSeedLogs.join(', ')}`);
    console.log(`Admin    : ${adminAccount.username} / ${adminAccount.password} (${adminAccount.action})`);
    console.log(`Lãnh đạo : ${lanhDaoAccount.username} / ${lanhDaoAccount.password} (${lanhDaoAccount.action})`);
    console.log(`GV 1     : ${gvAccount1.username} / ${gvAccount1.password} (${gvAccount1.action})`);
    console.log(`GV 2     : ${gvAccount2.username} / ${gvAccount2.password} (${gvAccount2.action})`);
    console.log(`Học kỳ hiện tại: ${hocKy1.ten_hocky}, ${hocKy2.ten_hocky}`);

    Object.entries(thongKe).forEach(([table, count]) => {
      console.log(`${table.padEnd(14, ' ')}: ${count}`);
    });

    console.log('======================================\n');
  } catch (error) {
    console.error('Seed data failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
