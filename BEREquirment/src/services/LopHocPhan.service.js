const db = require('../models');
const { Op } = require('sequelize');
const xlsx = require("xlsx");
const crypto = require("crypto");
const moment = require("moment");


// const getStudentsByLopHocPhan = async (lophocphan_id, ngay) => {
//   try {
//     return await db.DangKyHoc.findAll({
//       where: { lophocphan_id },
//       include: [
//         {
//           model: db.SinhVien,
//           as: "SinhVien",
//           attributes: ["sinhvien_id", "ma_sv", "ten", "email", "sdt", "ngaysinh"],
//           include: [
//             {
//               model: db.DiemDanh,
//               as: "DanhSachDiemDanh",
//               where: { ngay }, 
//               required: false
//             }
//           ]
//         }
//       ],
//       order: [[db.SinhVien, "ten", "ASC"]]
//     });
//   } catch (error) {
//     throw new Error(`Lỗi truy vấn sinh viên lớp học phần: ${error.message}`);
//   }
// };

const getStudentsByLopHocPhan = async (lophocphan_id, ngay) => {
  try {
    return await db.DangKyHoc.findAll({
      where: { lophocphan_id },
      include: [
        {
          model: db.SinhVien,
          as: "SinhVien",
          attributes: ["sinhvien_id", "ma_sv", "ten", "email", "sdt"],
          include: [
            {
              model: db.DiemDanh,
              as: "DanhSachDiemDanh",
              required: false,
              include: [
                {
                  model: db.BuoiHoc,
                  as: "BuoiHoc",
                  where: { ngay },
                  required: false
                }
              ]
            }
          ]
        }
      ],
      order: [[db.SinhVien, "ten", "ASC"]]
    });
  } catch (error) {
    throw new Error(`Lỗi truy vấn sinh viên lớp học phần: ${error.message}`);
  }
};

// const getAllLopHocPhan = async (query) => {
//     try {
//         const { hocky_id, giangvien_id, khoa_id } = query;
//         const whereClause = {};

//         if (hocky_id) {
//             whereClause.hocky_id = hocky_id;
//         }

//         if (giangvien_id) {
//             whereClause.giangvien_id = giangvien_id;
//         }
//         const data = await db.LopHocPhan.findAll({
//             where: whereClause,
//             include: [
//                 {
//                     model: db.MonHoc,
//                     attributes: ['monhoc_id', 'ma_mon', 'ten_mon', 'sotinchi'],
//                     include: [
//                         {
//                             model: db.Khoa,
//                             as: 'Khoa', 
//                             attributes: ['khoa_id', 'ten_khoa', 'ma_khoa']
//                         }
//                     ]
//                 },
//                 {
//                     model: db.LopHanhChinh,
//                     as: 'LopHanhChinh',
//                     attributes: ['lop_hanhchinh_id', 'ten_lop'],
//                     include: [
//                         {
//                             model: db.Khoa,
//                             as: 'Khoa', 
//                             attributes: ['khoa_id', 'ten_khoa', 'ma_khoa']
//                         }
//                     ]
//                 },
//                 {
//                     model: db.GiangVien,
//                     attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten', 'email']
//                 },
//                 {
//                     model: db.HocKy,
//                     attributes: ['hocky_id', 'ten_hocky']
//                 }
//             ],
//             order: [['ngay_tao', 'DESC']]
//         });

//         return {
//             success: true,
//             data: data
//         };
//     } catch (error) {
//         console.error('Service Error:', error);
//         throw error;
//     }
// };
const getAllLopHocPhan = async (query) => {
    try {
        const { hocky_id } = query;
        
        const data = await db.LopHocPhan.findAll({
            where: { hocky_id },
            // 1. Chỉ lấy ID và Tên của Lớp học phần
            attributes: ['lophocphan_id', 'ten_lophocphan'], 
            include: [
                {
                    // 2. Lấy Môn học (ID + Tên + Mã)
                    model: db.MonHoc,
                    attributes: ['monhoc_id', 'ten_mon', 'ma_mon'],
                },
                {
                    // 3. Lấy Giảng viên (ID + Tên + SĐT)
                    model: db.GiangVien,
                    attributes: ['giangvien_id', 'ho', 'ten', 'sdt'],
                },
                {
                    // 4. Lấy danh sách các Lớp hành chính học chung (Xử lý lớp ghép)
                    model: db.LopHanhChinh,
                    as: 'DanhSachLopHanhChinh', // Phải khớp 100% với alias trong models/LopHocPhan.js
                    attributes: ['lop_hanhchinh_id', 'ten_lop'],
                    through: { attributes: [] } // Loại bỏ dữ liệu thừa từ bảng trung gian LHP_LHC
                },
                {
                    // 5. Lấy thông tin học kỳ để hiển thị tiêu đề
                    model: db.HocKy,
                    attributes: ['hocky_id', 'ten_hocky']
                }
            ],
            // Sắp xếp theo tên môn học cho dễ nhìn
            order: [[{ model: db.MonHoc }, 'ten_mon', 'ASC']]
        });

        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('Service Error:', error);
        throw error;
    }
};



const getAllLopHocLai = async () => {
  return await db.LopHocPhan.findAll({
    where: {
      ten_lophocphan: { [Op.like]: 'HL_%' } // lớp học lại bắt đầu bằng HL_
    },
    order: [['ten_lophocphan', 'ASC']]
  });
};

// Lấy sinh viên trong lớp học lại
const getSinhVienByLopHocLai = async (lophocphan_id) => {
  return await db.DangKyHoc.findAll({
    where: { lophocphan_id },
    include: [
      {
        model: db.SinhVien,
        as: 'SinhVien',
        attributes: ['sinhvien_id', 'ten_sinhvien', 'lop_hanhchinh_id'],
        include: [
          {
            model: db.LopHanhChinh,
            as: 'LopHanhChinh',
            attributes: ['ten_lop', 'khoa_id'],
            include: [
              {
                model: db.Khoa,
                as: 'Khoa',
                attributes: ['ten_khoa']
              }
            ]
          }
        ]
      }
    ]
  });
};

const normalizeDate = (rawDate) => {
  if (!rawDate) return null;

  // 1. Nếu Excel đã parse sẵn thành đối tượng Date (do cellDates: true)
  if (rawDate instanceof Date) {
    const m = moment(rawDate);
    return m.isValid() ? m.format("YYYY-MM-DD") : null;
  }

  // 2. Nếu là chuỗi (ví dụ "10/08/2007" hoặc "2007-08-10")
  const dateString = rawDate.toString().trim();
  
  // Thử parse theo các định dạng phổ biến trong Excel Việt Nam
  // Ưu tiên DD/MM/YYYY rồi mới đến các kiểu khác
  const formats = ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"];
  const m = moment(dateString, formats, true); // true để check strict mode

  return m.isValid() ? m.format("YYYY-MM-DD") : null;
};

const importSinhVienFromExcel = async (lophocphan_id, fileBuffer) => {
  // Kiểm tra lớp học phần
  const lhp = await db.LopHocPhan.findByPk(lophocphan_id);
  if (!lhp) throw new Error("Lớp học phần không tồn tại.");

  // Đọc file
  const workbook = xlsx.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const dataRows = rows.slice(11); // Bắt đầu từ dòng 12
  const errors = [];
  const validData = [];

  // --- BƯỚC 1: VALIDATE VÀ CHUẨN HÓA TOÀN BỘ ---
  dataRows.forEach((row, index) => {
    const rowIndex = index + 12;
    if (!row[1] || !row[2]) return; // Bỏ qua dòng trống

    const ma_sv = row[1]?.toString().trim();
    const ho_ten = row[2]?.toString().trim();
    const ten_lop_hc = row[3]?.toString().trim() || "Lớp tự do";
    const raw_ngay_sinh = row[4];
    const sdt = row[6]?.toString().trim() || null;

    // Chuẩn hóa ngày sinh
    const clean_ngay_sinh = normalizeDate(raw_ngay_sinh);
    
    // Validate dữ liệu
    if (raw_ngay_sinh && !clean_ngay_sinh) {
      errors.push(`Dòng ${rowIndex}: Ngày sinh '${raw_ngay_sinh}' không đúng định dạng (Yêu cầu: DD/MM/YYYY).`);
    }

    if (!ma_sv) {
      errors.push(`Dòng ${rowIndex}: Thiếu Mã sinh viên.`);
    }

    validData.push({
      ma_sv,
      ho_ten,
      ten_lop_hc,
      ngay_sinh: clean_ngay_sinh,
      sdt,
      rowIndex
    });
  });

  // NẾU CÓ BẤT KỲ LỖI NÀO THÌ DỪNG LẠI NGAY
  if (errors.length > 0) {
    const validationError = new Error("Dữ liệu Excel không hợp lệ");
    validationError.details = errors;
    throw validationError;
  }

  // --- BƯỚC 2: THỰC HIỆN GHI DB TRONG TRANSACTION ---
  const t = await db.sequelize.transaction();
  try {
    const results = { imported: 0, updated: 0, total: validData.length };

    for (const item of validData) {
      // 1. Xử lý Lớp Hành Chính
      const [lhc] = await db.LopHanhChinh.findOrCreate({
        where: { ten_lop: item.ten_lop_hc },
        defaults: { 
          lop_hanhchinh_id: crypto.randomUUID(),
          isDeleted: false 
        },
        transaction: t
      });

      // 2. Xử lý Sinh Viên
      let sv = await db.SinhVien.findOne({ where: { ma_sv: item.ma_sv }, transaction: t });
      if (!sv) {
        sv = await db.SinhVien.create({
          sinhvien_id: crypto.randomUUID(),
          ma_sv: item.ma_sv,
          ten: item.ho_ten,
          lop_hanhchinh_id: lhc.lop_hanhchinh_id,
          ngaysinh: item.ngay_sinh,
          sdt: item.sdt,
          isDeleted: false
        }, { transaction: t });
        results.imported++;
      } else {
        // Nếu đã tồn tại thì cập nhật thông tin mới nhất từ Excel
        await sv.update({ 
          ten: item.ho_ten, 
          ngaysinh: item.ngay_sinh,
          sdt: item.sdt || sv.sdt 
        }, { transaction: t });
        results.updated++;
      }

      // 3. Đăng ký vào Lớp Học Phần (DangKyHoc)
      await db.DangKyHoc.findOrCreate({
        where: { sinhvien_id: sv.sinhvien_id, lophocphan_id },
        defaults: {
          dangky_id: crypto.randomUUID(),
          trangthai: 'active'
        },
        transaction: t
      });

      // 4. Liên kết bảng trung gian LHP_LHC
      await db.LHP_LHC.findOrCreate({
        where: { lophocphan_id, lop_hanhchinh_id: lhc.lop_hanhchinh_id },
        transaction: t
      });
    }

    await t.commit();
    return results;
  } catch (dbError) {
    await t.rollback();
    throw dbError;
  }
};

const getDanhSachSinhVien = async (lophocphan_id) => {
  try {
    const data = await db.DangKyHoc.findAll({
      where: { lophocphan_id },
      include: [
        {
          model: db.SinhVien,
          as: 'SinhVien', // Alias phải khớp với định nghĩa trong model DangKyHoc
          attributes: ['sinhvien_id', 'ma_sv', 'ten', 'email', 'sdt', 'ngaysinh'],
          include: [
            {
              model: db.LopHanhChinh,
              as: 'Lop', // Alias trong model SinhVien
              attributes: ['ten_lop']
            }
          ]
        }
      ],
      order: [[{ model: db.SinhVien, as: 'SinhVien' }, 'ten', 'ASC']]
    });

    return data;
  } catch (error) {
    throw new Error(`Lỗi lấy danh sách sinh viên: ${error.message}`);
  }
};

module.exports = { 
  getStudentsByLopHocPhan,
  getAllLopHocPhan,
  getAllLopHocLai,
  getSinhVienByLopHocLai,
  importSinhVienFromExcel,
  getDanhSachSinhVien
};


