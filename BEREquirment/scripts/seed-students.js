'use strict';

/**
 * Script to automatically generate Vietnamese students with unique names, emails, phones,
 * and assign them to existing LopHanhChinh classes (40-60 students per class).
 * Also registers them to the corresponding course classes (LopHocPhan) linked via LHP_LHC.
 * 
 * Usage:
 *   node scripts/seed-students.js
 */

require('dotenv').config();
const db = require('../src/models');
const { SinhVien, LopHanhChinh, LHP_LHC, DangKyHoc, sequelize } = db;

// Vietnamese Name Components
const HOS = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Lương', 'Trịnh'];
const DEM_NAM = ['Văn', 'Hữu', 'Minh', 'Quốc', 'Đức', 'Anh', 'Thế', 'Đình', 'Duy', 'Tiến', 'Thành', 'Nhật', 'Xuân', 'Khắc', 'Gia', 'Bảo', 'Đông'];
const TEN_NAM = ['Anh', 'Bảo', 'Cường', 'Dũng', 'Duy', 'Đạt', 'Đức', 'Hải', 'Hiếu', 'Hoàng', 'Hùng', 'Huy', 'Khoa', 'Lâm', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phong', 'Quân', 'Quang', 'Sơn', 'Thái', 'Thành', 'Thiên', 'Thịnh', 'Tiến', 'Toàn', 'Trung', 'Tuấn', 'Tùng', 'Việt', 'Vinh', 'Phúc', 'Lộc', 'Khang', 'Khánh'];
const DEM_NU = ['Thị', 'Ngọc', 'Minh', 'Phương', 'Kim', 'Tuyết', 'Thanh', 'Khánh', 'Thu', 'Hải', 'Diệu', 'Quỳnh', 'Hồng', 'Cát', 'Mỹ', 'Như', 'Ánh'];
const TEN_NU = ['Anh', 'Chi', 'Diệp', 'Dung', 'Giang', 'Hà', 'Hân', 'Hằng', 'Hiền', 'Hoa', 'Hương', 'Huyền', 'Khanh', 'Lan', 'Linh', 'Mai', 'My', 'Ngọc', 'Oanh', 'Phương', 'Quỳnh', 'Thảo', 'Thanh', 'Thư', 'Thương', 'Thủy', 'Trang', 'Trinh', 'Trúc', 'Vân', 'Vy', 'Yến', 'Tú', 'Nhi', 'Trà', 'Nguyệt'];

const PHONE_PREFIXES = ['090', '091', '098', '097', '032', '035', '038', '086', '070', '079', '089', '088', '096', '093', '094'];

// Helper to remove diacritics for email slug
function slugifyName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .join('.');
}

// Generate unique name using combination
const usedNames = new Set();
function generateVietnameseName() {
  let attempts = 0;
  while (attempts < 1000) {
    const isMale = Math.random() < 0.5;
    const ho = HOS[Math.floor(Math.random() * HOS.length)];
    let dem, ten;

    if (isMale) {
      dem = DEM_NAM[Math.floor(Math.random() * DEM_NAM.length)];
      ten = TEN_NAM[Math.floor(Math.random() * TEN_NAM.length)];
    } else {
      dem = DEM_NU[Math.floor(Math.random() * DEM_NU.length)];
      ten = TEN_NU[Math.floor(Math.random() * TEN_NU.length)];
    }

    const fullName = `${ho} ${dem} ${ten}`;
    if (!usedNames.has(fullName)) {
      usedNames.add(fullName);
      return fullName;
    }
    attempts++;
  }
  // Fallback
  return `${HOS[0]} ${DEM_NAM[0]} ${Date.now().toString().slice(-4)}`;
}

// Generate unique phone number
const usedPhones = new Set();
function generatePhoneNumber() {
  while (true) {
    const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
    const suffix = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7 digits
    const phone = `${prefix}${suffix}`;
    if (!usedPhones.has(phone)) {
      usedPhones.add(phone);
      return phone;
    }
  }
}

async function main() {
  console.log('----------------------------------------------------');
  console.log('Bắt đầu sinh ngẫu nhiên sinh viên vào các lớp hành chính...');
  console.log('----------------------------------------------------');

  try {
    await sequelize.authenticate();

    // 1. Lấy tất cả lớp hành chính đang hoạt động
    const lopHanhChinhs = await LopHanhChinh.findAll({
      where: { isDeleted: false }
    });

    if (lopHanhChinhs.length === 0) {
      console.log('⚠️ Không tìm thấy lớp hành chính nào trong hệ thống để thêm sinh viên.');
      return;
    }

    console.log(`Tìm thấy ${lopHanhChinhs.length} lớp hành chính. Tiến hành tạo sinh viên...`);

    // 2. Lấy ánh xạ lớp học phần - lớp hành chính
    const lhpLhcs = await LHP_LHC.findAll();
    const lhcToLhpMap = {}; // lop_hanhchinh_id => list of lophocphan_id
    lhpLhcs.forEach(link => {
      if (!lhcToLhpMap[link.lop_hanhchinh_id]) {
        lhcToLhpMap[link.lop_hanhchinh_id] = [];
      }
      lhcToLhpMap[link.lop_hanhchinh_id].push(link.lophocphan_id);
    });

    let totalCreated = 0;
    let totalRegistered = 0;

    const transaction = await sequelize.transaction();

    try {
      for (const lop of lopHanhChinhs) {
        const countToCreate = Math.floor(40 + Math.random() * 21); // Random 40 - 60
        console.log(`- Lớp ${lop.ten_lop} (Niên khóa: ${lop.nien_khoa || 2024}): Sinh ${countToCreate} sinh viên.`);

        const nienKhoa = lop.nien_khoa || 2024;
        const entryYearShort = String(nienKhoa).slice(-2);
        
        // Bắt đầu đếm sinh viên cho lớp này để tạo mã số tuần tự
        let studentIndexStart = 1;
        // Kiểm tra xem đã có sinh viên nào của niên khóa này chưa để tránh trùng mã
        const lastStudent = await SinhVien.findOne({
          where: {
            ma_sv: {
              [db.Sequelize.Op.like]: `${entryYearShort}1%`
            }
          },
          order: [['ma_sv', 'DESC']],
          transaction
        });

        if (lastStudent) {
          const lastNum = parseInt(lastStudent.ma_sv.slice(3));
          if (!isNaN(lastNum)) {
            studentIndexStart = lastNum + 1;
          }
        }

        const sinhViensToCreate = [];
        const linkedLhpIds = lhcToLhpMap[lop.lop_hanhchinh_id] || [];

        for (let i = 0; i < countToCreate; i++) {
          const ma_sv = `${entryYearShort}1${String(studentIndexStart + i).padStart(5, '0')}`;
          const ten = generateVietnameseName();
          const email = `${slugifyName(ten)}.${ma_sv}@sv.utehy.edu.vn`;
          const sdt = generatePhoneNumber();

          // Tính ngày sinh ngẫu nhiên (sinh viên nhập học lúc 18 tuổi)
          const birthYear = nienKhoa - 18;
          const month = Math.floor(Math.random() * 12) + 1;
          const maxDays = new Date(birthYear, month, 0).getDate();
          const day = Math.floor(Math.random() * maxDays) + 1;
          const ngaysinh = `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          sinhViensToCreate.push({
            ma_sv,
            ten,
            email,
            sdt,
            lop_hanhchinh_id: lop.lop_hanhchinh_id,
            ngaysinh,
            trang_thai: 'Đang học',
            isDeleted: false,
            ngay_tao: new Date()
          });
        }

        // Lưu sinh viên vào DB
        const createdSinhViens = await SinhVien.bulkCreate(sinhViensToCreate, { transaction });
        totalCreated += createdSinhViens.length;

        // Đăng ký học phần cho sinh viên vừa tạo
        if (linkedLhpIds.length > 0) {
          const dangKyHocsToCreate = [];
          for (const sv of createdSinhViens) {
            for (const lhpId of linkedLhpIds) {
              dangKyHocsToCreate.push({
                sinhvien_id: sv.sinhvien_id,
                lophocphan_id: lhpId,
                ngay_dangky: new Date(),
                trangthai: 'active'
              });
            }
          }
          if (dangKyHocsToCreate.length > 0) {
            await DangKyHoc.bulkCreate(dangKyHocsToCreate, { transaction });
            totalRegistered += dangKyHocsToCreate.length;
          }
        }
      }

      await transaction.commit();
      console.log('----------------------------------------------------');
      console.log('🎉 Seed dữ liệu sinh viên hoàn tất!');
      console.log(`- Đã tạo mới: ${totalCreated} sinh viên.`);
      console.log(`- Đã đăng ký: ${totalRegistered} lượt học phần (DangKyHoc).`);
      console.log('----------------------------------------------------');

    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình sinh dữ liệu sinh viên:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
