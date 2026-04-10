require('dotenv').config();
const db = require('../models');

function pickStatus({ studentIndex, sessionIndex, isHighRiskStudent }) {
  if (isHighRiskStudent) {
    return sessionIndex % 4 === 0 ? 'present' : 'absent';
  }

  if (studentIndex % 5 === 0) {
    if (sessionIndex % 5 === 0) return 'absent';
    if (sessionIndex % 3 === 0) return 'late';
    return 'present';
  }

  if (studentIndex % 4 === 0) {
    if (sessionIndex % 7 === 0) return 'excused';
    if (sessionIndex % 4 === 0) return 'late';
    return 'present';
  }

  return sessionIndex % 8 === 0 ? 'late' : 'present';
}

async function ensureCompletedSessionsForClass(lophocphanId) {
  const allSessions = await db.BuoiHoc.findAll({
    where: { lophocphan_id: lophocphanId },
    order: [['ngay', 'ASC']]
  });

  if (!allSessions.length) return [];

  let completedSessions = allSessions.filter((s) => s.trangthai === 'completed');
  if (completedSessions.length > 0) return completedSessions;

  const toComplete = allSessions.slice(0, Math.min(allSessions.length, 5));
  for (const session of toComplete) {
    await session.update({ trangthai: 'completed' });
  }

  return toComplete;
}

async function upsertAttendanceRecord({ buoiId, sinhvienId, trangthai }) {
  const existing = await db.DiemDanh.findOne({
    where: {
      buoi_id: buoiId,
      sinhvien_id: sinhvienId
    }
  });

  if (existing) {
    await existing.update({
      trangthai,
      ghichu: 'Seed thống kê điểm danh',
      thoigian_danhdau: new Date()
    });
    return 'updated';
  }

  await db.DiemDanh.create({
    buoi_id: buoiId,
    sinhvien_id: sinhvienId,
    trangthai,
    ghichu: 'Seed thống kê điểm danh',
    thoigian_danhdau: new Date()
  });

  return 'created';
}

async function run() {
  try {
    await db.sequelize.authenticate();

    const allClasses = await db.LopHocPhan.findAll({
      attributes: ['lophocphan_id', 'ma_lop', 'ten_lophocphan'],
      order: [['ma_lop', 'ASC']]
    });

    if (!allClasses.length) {
      console.log('Không có lớp học phần để seed điểm danh. Hãy chạy npm run seed:data trước.');
      return;
    }

    let classCount = 0;
    let completedSessionCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let warningStudentCount = 0;

    for (const lhp of allClasses) {
      const activeRegistrations = await db.DangKyHoc.findAll({
        where: {
          lophocphan_id: lhp.lophocphan_id,
          trangthai: 'active'
        },
        order: [['sinhvien_id', 'ASC']]
      });

      if (!activeRegistrations.length) continue;

      const completedSessions = await ensureCompletedSessionsForClass(lhp.lophocphan_id);
      if (!completedSessions.length) continue;

      classCount += 1;
      completedSessionCount += completedSessions.length;

      for (let studentIndex = 0; studentIndex < activeRegistrations.length; studentIndex++) {
        const registration = activeRegistrations[studentIndex];
        const isHighRiskStudent = studentIndex === 0;

        if (isHighRiskStudent) {
          warningStudentCount += 1;
        }

        for (let sessionIndex = 0; sessionIndex < completedSessions.length; sessionIndex++) {
          const session = completedSessions[sessionIndex];
          const status = pickStatus({
            studentIndex,
            sessionIndex,
            isHighRiskStudent
          });

          const action = await upsertAttendanceRecord({
            buoiId: session.buoi_id,
            sinhvienId: registration.sinhvien_id,
            trangthai: status
          });

          if (action === 'created') createdCount += 1;
          if (action === 'updated') updatedCount += 1;
        }
      }
    }

    console.log('\n=== Seed điểm danh thành công ===');
    console.log(`Lớp đã xử lý           : ${classCount}`);
    console.log(`Buổi completed đã dùng : ${completedSessionCount}`);
    console.log(`Bản ghi tạo mới        : ${createdCount}`);
    console.log(`Bản ghi cập nhật       : ${updatedCount}`);
    console.log(`SV cảnh báo mẫu (>20%) : ${warningStudentCount}`);
    console.log('===============================\n');
  } catch (error) {
    console.error('Seed điểm danh thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

run();
