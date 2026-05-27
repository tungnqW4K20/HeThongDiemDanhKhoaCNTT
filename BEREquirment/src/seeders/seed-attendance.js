require('dotenv').config();
const db = require('../models');

function pickStatus({ studentIndex, sessionIndex, isHighRiskStudent }) {
  if (isHighRiskStudent) {
    // Để sinh viên cảnh báo có tỷ lệ nghỉ >20% (ngưỡng cảnh báo) để giảng viên kiểm thử màn cảnh báo:
    // Ta cho nghỉ 22% (khoảng 2/9 buổi)
    const r = (sessionIndex + studentIndex) % 9;
    if (r === 0 || r === 3) return 'absent'; // ~22% vắng không phép
    if (r === 6) return 'late'; // ~11% đi muộn
    return 'present';
  }

  // Đối với sinh viên thông thường: tỷ lệ đi muộn, vắng cực kỳ ít
  const hash = studentIndex * 17 + sessionIndex * 31;
  const r = hash % 1000;

  if (r < 8) {
    return 'absent'; // 0.8% vắng không phép (< 1%)
  }
  if (r < 26) {
    return 'excused'; // 1.8% vắng có phép (< 2%)
  }
  if (r < 34) {
    return 'late'; // 0.8% đi muộn (< 1%)
  }

  return 'present'; // 96.6% đi học đầy đủ
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

async function upsertAttendanceRecord({ buoiId, sinhvienId, trangthai, hockyId }) {
  const existing = await db.DiemDanh.findOne({
    where: {
      buoi_id: buoiId,
      sinhvien_id: sinhvienId
    }
  });

  let ghichu = '';
  if (trangthai === 'excused') {
    ghichu = 'Có đơn xin nghỉ';
  } else if (trangthai === 'late') {
    ghichu = 'Vào muộn';
  }

  if (existing) {
    await existing.update({
      trangthai,
      ghichu,
      thoigian_danhdau: new Date(),
      hocky_id: hockyId
    });
    return 'updated';
  }

  await db.DiemDanh.create({
    buoi_id: buoiId,
    sinhvien_id: sinhvienId,
    trangthai,
    ghichu,
    thoigian_danhdau: new Date(),
    hocky_id: hockyId
  });

  return 'created';
}

async function run() {
  try {
    await db.sequelize.authenticate();

    const allClasses = await db.LopHocPhan.findAll({
      attributes: ['lophocphan_id', 'ma_lop', 'ten_lophocphan', 'hocky_id'],
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

      // Xóa tất cả điểm danh cũ của các buổi này để dọn sạch các bản ghi 'present' cũ
      const completedBuoiIds = completedSessions.map(s => s.buoi_id);
      await db.DiemDanh.destroy({
        where: {
          buoi_id: { [db.Sequelize.Op.in]: completedBuoiIds }
        }
      });

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

          if (status === 'present') {
            continue;
          }

          const action = await upsertAttendanceRecord({
            buoiId: session.buoi_id,
            sinhvienId: registration.sinhvien_id,
            trangthai: status,
            hockyId: lhp.hocky_id
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
