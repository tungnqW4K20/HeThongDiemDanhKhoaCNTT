require('dotenv').config();
const { Op } = require('sequelize');
const db = require('../models');

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const withDays = (base, offset) => {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d;
};

const toStartTime = (dateOnly, hour, minute) => {
  return new Date(`${dateOnly}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
};

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

    const gv = await db.GiangVien.findOne({ where: { ma_gv: 'GV001' } });
    if (!gv) {
      throw new Error('Không tìm thấy GV001. Hãy chạy npm run seed:data trước.');
    }

    const now = new Date();
    const today = formatDate(now);
    const tomorrow = formatDate(withDays(now, 1));
    const dayAfter = formatDate(withDays(now, 2));

    let hocKy = await db.HocKy.findOne({
      where: {
        ten_hocky: { [Op.like]: '%Học kỳ 2 (2025-2026)%' }
      }
    });

    if (!hocKy) {
      hocKy = await db.HocKy.findOne({
        where: {
          ngay_batdau: { [Op.lte]: today },
          ngay_ketthuc: { [Op.gte]: today }
        },
        order: [['ngay_batdau', 'DESC']]
      });
    }

    if (!hocKy) {
      throw new Error('Không tìm thấy học kỳ phù hợp để seed lịch.');
    }

    const khoaId = gv.khoa_id || (await db.Khoa.findOne({ where: { ma_khoa: 'CNTT' } }))?.khoa_id;
    if (!khoaId) {
      throw new Error('Không tìm thấy khoa cho GV001.');
    }

    const [mon] = await db.MonHoc.findOrCreate({
      where: { ma_mon: 'SEEDLICH001' },
      defaults: {
        khoa_id: khoaId,
        ma_mon: 'SEEDLICH001',
        ten_mon: 'Môn seed lịch GV001',
        sotinchi: 3,
        mota: 'Dữ liệu seed để test lịch dạy và đề xuất chỉnh sửa',
        isDeleted: false
      }
    });

    const lopHC =
      (await db.LopHanhChinh.findOne({ where: { ten_lop: '12422TN' } })) ||
      (await db.LopHanhChinh.create({
        khoa_id: khoaId,
        ten_lop: 'TEST_LICH_GV001',
        nien_khoa: 2025,
        chuong_trinh: 'Kỹ sư',
        ghichu: 'Lớp seed cho lịch giảng dạy GV001',
        giangvien_id: gv.giangvien_id,
        isDeleted: false,
        ngay_tao: new Date()
      }));

    const lhp = await upsertLopHocPhan({
      monhoc_id: mon.monhoc_id,
      giangvien_id: gv.giangvien_id,
      hocky_id: hocKy.hocky_id,
      ten_lophocphan: `Seed lịch cho ${gv.ho} ${gv.ten}`,
      ma_lop: 'SEED_GV001_HK2_2526',
      phong: 'PH301',
      thu: 4,
      tiet_bat_dau: 7,
      so_tiet: 4,
      tuan_hoc: [1, 2, 3, 4, 5],
      loai_hoc_phan: 'LT'
    });

    await db.LHP_LHC.findOrCreate({
      where: {
        lophocphan_id: lhp.lophocphan_id,
        lop_hanhchinh_id: lopHC.lop_hanhchinh_id
      },
      defaults: {
        lophocphan_id: lhp.lophocphan_id,
        lop_hanhchinh_id: lopHC.lop_hanhchinh_id
      }
    });

    const buoiToday = await upsertBuoiHoc({
      lophocphan_id: lhp.lophocphan_id,
      ngay: today,
      trangthai: 'scheduled',
      is_override: false,
      ghi_chu: 'Seed lịch hôm nay cho GV001',
      tiet_bat_dau: 9,
      so_tiet: 2,
      phong: 'PH301',
      batdau: toStartTime(today, 15, 0),
      giangvien_day_thay_id: null
    });

    const buoiTomorrow = await upsertBuoiHoc({
      lophocphan_id: lhp.lophocphan_id,
      ngay: tomorrow,
      trangthai: 'scheduled',
      is_override: false,
      ghi_chu: 'Seed lịch ngày mai cho GV001',
      tiet_bat_dau: 7,
      so_tiet: 4,
      phong: 'PH301',
      batdau: toStartTime(tomorrow, 13, 0),
      giangvien_day_thay_id: null
    });

    const buoiDayAfter = await upsertBuoiHoc({
      lophocphan_id: lhp.lophocphan_id,
      ngay: dayAfter,
      trangthai: 'scheduled',
      is_override: false,
      ghi_chu: 'Seed lịch ngày kia cho tab Lịch dạy',
      tiet_bat_dau: 1,
      so_tiet: 4,
      phong: 'PH305',
      batdau: toStartTime(dayAfter, 7, 0),
      giangvien_day_thay_id: null
    });

    // Dọn đề xuất pending cũ để có thể test lại nhiều lần mà không bị chặn.
    const deletedPending = await db.DeXuatChinhSua.destroy({
      where: {
        nguoi_de_xuat_id: gv.giangvien_id,
        loai_de_xuat: 'chinh_sua',
        trang_thai: 'pending',
        buoi_id: {
          [Op.in]: [buoiToday.buoi_id, buoiTomorrow.buoi_id, buoiDayAfter.buoi_id]
        }
      }
    });

    console.log('\n=== Seed lịch GV001 thành công ===');
    console.log(`Giảng viên        : ${gv.ma_gv} - ${gv.ho} ${gv.ten}`);
    console.log(`Học kỳ            : ${hocKy.ten_hocky} (${hocKy.hocky_id})`);
    console.log(`LHP seed          : ${lhp.ma_lop} (${lhp.lophocphan_id})`);
    console.log(`Buổi hôm nay      : ${buoiToday.buoi_id} | ${today} | Tiết ${buoiToday.tiet_bat_dau}-${buoiToday.tiet_bat_dau + buoiToday.so_tiet - 1}`);
    console.log(`Buổi ngày mai     : ${buoiTomorrow.buoi_id} | ${tomorrow} | Tiết ${buoiTomorrow.tiet_bat_dau}-${buoiTomorrow.tiet_bat_dau + buoiTomorrow.so_tiet - 1}`);
    console.log(`Buổi ngày kia     : ${buoiDayAfter.buoi_id} | ${dayAfter} | Tiết ${buoiDayAfter.tiet_bat_dau}-${buoiDayAfter.tiet_bat_dau + buoiDayAfter.so_tiet - 1}`);
    console.log(`Đã xóa pending cũ : ${deletedPending}`);
    console.log('==================================\n');
  } catch (error) {
    console.error('Seed lịch GV001 thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
