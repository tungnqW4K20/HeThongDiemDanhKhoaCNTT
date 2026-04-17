require('dotenv').config();
const db = require('../models');
const crypto = require('crypto');

const MAX_CLASSES = 30;
const MAX_STUDENTS_PER_CLASS = 45;

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pickAttendanceStatus(studentIndex, dateIndex) {
  if (studentIndex % 10 === 0) {
    return dateIndex === 0 ? 'absent' : 'late';
  }
  if (studentIndex % 6 === 0) {
    return dateIndex === 0 ? 'late' : 'present';
  }
  if (studentIndex % 14 === 0) {
    return 'excused';
  }
  return 'present';
}

async function upsertSessionForDate(lhp, ngayHoc) {
  const [buoiHoc, created] = await db.BuoiHoc.findOrCreate({
    where: {
      lophocphan_id: lhp.lophocphan_id,
      ngay: ngayHoc
    },
    defaults: {
      buoi_id: crypto.randomUUID(),
      lophocphan_id: lhp.lophocphan_id,
      ngay: ngayHoc,
      trangthai: 'completed',
      tiet_bat_dau: lhp.tiet_bat_dau || 1,
      so_tiet: lhp.so_tiet || 3,
      phong: lhp.phong || 'A1.01',
      ghi_chu: 'Seed demo lich day va diem danh hom nay/ngay mai',
      batdau: new Date(`${ngayHoc}T07:00:00`)
    }
  });

  if (!created) {
    await buoiHoc.update({
      trangthai: 'completed',
      tiet_bat_dau: buoiHoc.tiet_bat_dau || lhp.tiet_bat_dau || 1,
      so_tiet: buoiHoc.so_tiet || lhp.so_tiet || 3,
      phong: buoiHoc.phong || lhp.phong || 'A1.01',
      ghi_chu: 'Cap nhat seed demo lich day va diem danh',
      batdau: buoiHoc.batdau || new Date(`${ngayHoc}T07:00:00`)
    });
  }

  return { buoiHoc, created };
}

async function upsertAttendance(buoiId, sinhvienId, status) {
  const [record, created] = await db.DiemDanh.findOrCreate({
    where: {
      buoi_id: buoiId,
      sinhvien_id: sinhvienId
    },
    defaults: {
      diemdanh_id: crypto.randomUUID(),
      buoi_id: buoiId,
      sinhvien_id: sinhvienId,
      trangthai: status,
      ghichu: 'Seed demo hom nay/ngay mai',
      thoigian_danhdau: new Date()
    }
  });

  if (!created) {
    await record.update({
      trangthai: status,
      ghichu: 'Cap nhat seed demo hom nay/ngay mai',
      thoigian_danhdau: new Date()
    });
  }

  return created ? 'created' : 'updated';
}

async function run() {
  try {
    await db.sequelize.authenticate();

    const today = new Date();
    const tomorrow = addDays(today, 1);
    const targetDates = [formatDateOnly(today), formatDateOnly(tomorrow)];

    const classes = await db.LopHocPhan.findAll({
      attributes: ['lophocphan_id', 'ma_lop', 'ten_lophocphan', 'phong', 'tiet_bat_dau', 'so_tiet'],
      order: [['ma_lop', 'ASC']]
    });

    if (!classes.length) {
      console.log('Khong tim thay LopHocPhan. Hay chay seed:data truoc.');
      return;
    }

    let handledClassCount = 0;
    let createdSessionCount = 0;
    let updatedSessionCount = 0;
    let createdAttendanceCount = 0;
    let updatedAttendanceCount = 0;

    for (const lhp of classes) {
      if (handledClassCount >= MAX_CLASSES) break;

      const registrations = await db.DangKyHoc.findAll({
        where: {
          lophocphan_id: lhp.lophocphan_id,
          trangthai: 'active'
        },
        order: [['ngay_dangky', 'ASC']]
      });

      if (!registrations.length) continue;

      handledClassCount += 1;
      const targetRegistrations = registrations.slice(0, MAX_STUDENTS_PER_CLASS);

      for (let dateIndex = 0; dateIndex < targetDates.length; dateIndex++) {
        const ngayHoc = targetDates[dateIndex];
        const { buoiHoc, created } = await upsertSessionForDate(lhp, ngayHoc);
        if (created) createdSessionCount += 1;
        else updatedSessionCount += 1;

        for (let studentIndex = 0; studentIndex < targetRegistrations.length; studentIndex++) {
          const registration = targetRegistrations[studentIndex];
          const status = pickAttendanceStatus(studentIndex, dateIndex);
          const action = await upsertAttendance(
            buoiHoc.buoi_id,
            registration.sinhvien_id,
            status
          );

          if (action === 'created') createdAttendanceCount += 1;
          else updatedAttendanceCount += 1;
        }
      }
    }

    console.log('\n=== Seed lich day + diem danh hom nay/ngay mai ===');
    console.log(`Ngay seed              : ${targetDates[0]} va ${targetDates[1]}`);
    console.log(`Lop hoc phan xu ly     : ${handledClassCount}`);
    console.log(`Buoi hoc tao moi       : ${createdSessionCount}`);
    console.log(`Buoi hoc cap nhat      : ${updatedSessionCount}`);
    console.log(`Diem danh tao moi      : ${createdAttendanceCount}`);
    console.log(`Diem danh cap nhat     : ${updatedAttendanceCount}`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('Seed that bai:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
