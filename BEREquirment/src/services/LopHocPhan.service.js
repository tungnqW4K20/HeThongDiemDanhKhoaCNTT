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
//     throw new Error(`L?i truy v?n sinh vi?n l?p h?c ph?n: ${error.message}`);
//   }
// };

const getStudentsByLopHocPhan = async (lophocphan_id, ngay) => {
  try {
    // Chuẩn hóa ngày đầu vào để so sánh chính xác (bỏ phần giờ phút giây)
    const ngayChuan = typeof ngay === 'string' ? ngay.split('T')[0] : ngay.toISOString().split('T')[0];

    const records = await db.DangKyHoc.findAll({
      where: { lophocphan_id, trangthai: 'active' },
      include: [
        {
          model: db.LopHocPhan,
          include: [{
            model: db.LopHanhChinh,
            as: "DanhSachLopHanhChinh",
            attributes: ["ten_lop"],
            through: { attributes: [] }
          }]
        },
        {
          model: db.SinhVien,
          attributes: ["sinhvien_id", "ma_sv", "ten", "email", "sdt"],
          include: [
            { model: db.LopHanhChinh, as: "Lop", attributes: ["ten_lop"] },
            {
              model: db.DiemDanh,
              as: "DanhSachDiemDanh",
              required: false,
              include: [{
                model: db.BuoiHoc,
                as: "BuoiHoc",
                where: {
                  lophocphan_id,
                  trangthai: 'completed' // CHỈ TÍNH CÁC BUỔI ĐÃ XÁC NHẬN DẠY
                },
                attributes: ['ngay', 'buoi_id']
              }]
            }
          ]
        }
      ],
      order: [[{ model: db.SinhVien }, "ten", "ASC"]]
    });

    return records.map(record => {
      const data = record.toJSON();
      const sv = data.SinhVien;
      if (!sv) return null;

      // validHistory: Chỉ chứa các buổi 'completed'
      const validHistory = sv.DanhSachDiemDanh || [];

      // Tính toán thống kê dựa trên các buổi ĐÃ HOÀN THÀNH
      const vang_kp = validHistory.filter(h => h.trangthai === 'absent').length;
      const vang_cp = validHistory.filter(h => h.trangthai === 'excused').length;
      const tong_vang = vang_kp + vang_cp;
      const tong_buoi_da_hoc = validHistory.length;
      const tile_nghi = tong_buoi_da_hoc > 0 ? (tong_vang / tong_buoi_da_hoc) * 100 : 0;

      // Lọc lấy dữ liệu điểm danh của ngày đang chọn (ngayChuan)
      const diemDanhHomNay = validHistory.filter(h => h.BuoiHoc && h.BuoiHoc.ngay === ngayChuan);

      return {
        ...data,
        DanhSachLopGhep: data.LopHocPhan?.DanhSachLopHanhChinh || [],
        SinhVien: {
          ...sv,
          DanhSachDiemDanh: diemDanhHomNay,
          DiemDanhSummary: {
            vang_kp, vang_cp, tong_vang,
            tong_buoi: tong_buoi_da_hoc,
            tile_nghi: tile_nghi.toFixed(1),
            canh_bao: tile_nghi >= 20
          },
          FullHistory: validHistory.map(h => ({
            ngay: h.BuoiHoc?.ngay,
            trangthai: h.trangthai,
            ghichu: h.ghichu
          }))
        }
      };
    }).filter(item => item !== null);

  } catch (error) {
    console.error("SERVICE ERROR:", error);
    throw new Error(`Lỗi: ${error.message}`);
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
const getAllLopHocPhan = async (query, target_khoa_id = null, target_chuyennganh_id = null, user_giangvien_id = null) => {
  try {
    const { hocky_id } = query;
    const mainWhere = { hocky_id };

    // Nếu là lãnh đạo khoa, lọc theo phạm vi khoa
    if (target_khoa_id && !target_chuyennganh_id) {
      mainWhere[Op.or] = [
        // 1. Môn học thuộc khoa (trực tiếp hoặc qua bộ môn)
        {
          monhoc_id: {
            [Op.in]: db.sequelize.literal(`(
                    SELECT m.monhoc_id 
                    FROM MonHoc m 
                    LEFT JOIN BoMon b ON m.bomon_id = b.bomon_id
                    WHERE m.khoa_id = '${target_khoa_id}' OR b.khoa_id = '${target_khoa_id}'
                )`)
          }
        },
        // 2. Có lớp hành chính thuộc khoa
        {
          lophocphan_id: {
            [Op.in]: db.sequelize.literal(`(
                    SELECT lhc_lhp.lophocphan_id 
                    FROM LHP_LHC lhc_lhp
                    JOIN LopHanhChinh lhc ON lhc_lhp.lop_hanhchinh_id = lhc.lop_hanhchinh_id
                    WHERE lhc.khoa_id = '${target_khoa_id}'
                )`)
          }
        }
      ];
    }

    // Nếu là trưởng bộ môn, lọc theo phạm vi bộ môn/chuyên ngành
    if (target_chuyennganh_id) {
      mainWhere[Op.or] = [
        // 1. Môn học thuộc bộ môn
        {
          monhoc_id: {
            [Op.in]: db.sequelize.literal(`(
                    SELECT monhoc_id 
                    FROM MonHoc 
                    WHERE bomon_id = '${target_chuyennganh_id}' OR chuyennganh_id = '${target_chuyennganh_id}'
                )`)
          }
        },
        // 2. Có lớp hành chính thuộc bộ môn/chuyên ngành
        {
          lophocphan_id: {
            [Op.in]: db.sequelize.literal(`(
                    SELECT lhc_lhp.lophocphan_id 
                    FROM LHP_LHC lhc_lhp
                    JOIN LopHanhChinh lhc ON lhc_lhp.lop_hanhchinh_id = lhc.lop_hanhchinh_id
                    WHERE lhc.chuyennganh_id = '${target_chuyennganh_id}' OR lhc.lop_hanhchinh_id = '${target_chuyennganh_id}'
                )`)
          }
        }
      ];
    }

    const data = await db.LopHocPhan.findAll({
      where: mainWhere,
      attributes: [
        'lophocphan_id',
        'ten_lophocphan',
        'ma_lop',
        'phong',
        'thu',
        'tiet_bat_dau',
        'so_tiet',
        'tuan_hoc',
        'loai_hoc_phan'
      ],
      include: [
        {
          model: db.MonHoc,
          attributes: ['monhoc_id', 'ten_mon', 'ma_mon', 'khoa_id'],
          required: false,
          include: [
            {
              model: db.Khoa,
              as: 'Khoa',
              attributes: ['khoa_id', 'ten_khoa']
            },
            {
              model: db.BoMon,
              as: 'BoMon',
              attributes: ['bomon_id', 'ten_bomon', 'khoa_id']
            }
          ]
        },
        {
          model: db.GiangVien,
          attributes: ['giangvien_id', 'ho', 'ten', 'sdt'],
        },
        {
          model: db.LopHanhChinh,
          as: 'DanhSachLopHanhChinh',
          attributes: ['lop_hanhchinh_id', 'ten_lop', 'khoa_id', 'chuyennganh_id'],
          through: { attributes: [] },
          required: false
        },
        {
          model: db.HocKy,
          attributes: ['hocky_id', 'ten_hocky']
        }
      ],
      subQuery: false,
      order: [[{ model: db.MonHoc }, 'ten_mon', 'ASC']]
    });

    return { success: true, data: data };
  } catch (error) {
    console.error('Service Error:', error);
    throw error;
  }
};

const normalizeWeekList = (input) => {
  if (Array.isArray(input)) {
    const list = input
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
    return [...new Set(list)].sort((a, b) => a - b);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const noBracket = trimmed.replace(/\[|\]/g, '');
    const list = noBracket
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0);
    return [...new Set(list)].sort((a, b) => a - b);
  }

  return [];
};

const updateLopHocPhanInfo = async (lophocphan_id, payload = {}) => {
  const t = await db.sequelize.transaction();
  try {
    if (!lophocphan_id) {
      await t.rollback();
      return { success: false, errCode: 1, message: 'Thiếu lophocphan_id.' };
    }

    const lopHocPhan = await db.LopHocPhan.findByPk(lophocphan_id, { transaction: t });
    if (!lopHocPhan) {
      await t.rollback();
      return { success: false, errCode: 2, message: 'Lớp học phần không tồn tại.' };
    }

    const ten_lophocphan = String(payload.ten_lophocphan || '').trim();
    const ma_lop_input = String(payload.ma_lop || '').trim();
    const lop_hanhchinh_ids = Array.isArray(payload.lop_hanhchinh_ids)
      ? [...new Set(payload.lop_hanhchinh_ids.map((item) => String(item || '').trim()).filter(Boolean))]
      : [];
    const phong = String(payload.phong || '').trim();
    const thu = Number(payload.thu);
    const tiet_bat_dau = Number(payload.tiet_bat_dau);
    const so_tiet = Number(payload.so_tiet);
    const loai_hoc_phan = String(payload.loai_hoc_phan || '').trim().toUpperCase();
    const tuan_hoc = normalizeWeekList(payload.tuan_hoc);

    let selectedLopHanhChinh = [];
    if (lop_hanhchinh_ids.length > 0) {
      selectedLopHanhChinh = await db.LopHanhChinh.findAll({
        where: {
          lop_hanhchinh_id: { [Op.in]: lop_hanhchinh_ids },
          isDeleted: false
        },
        attributes: ['lop_hanhchinh_id', 'ten_lop'],
        transaction: t
      });

      if (selectedLopHanhChinh.length !== lop_hanhchinh_ids.length) {
        await t.rollback();
        return { success: false, errCode: 3, message: 'Danh sách lớp hành chính không hợp lệ.' };
      }
    }

    const ma_lop = lop_hanhchinh_ids.length > 0
      ? lop_hanhchinh_ids
        .map((id) => selectedLopHanhChinh.find((item) => item.lop_hanhchinh_id === id)?.ten_lop)
        .filter(Boolean)
        .join('|')
      : ma_lop_input;

    if (!ten_lophocphan || !ma_lop || !phong) {
      await t.rollback();
      return {
        success: false,
        errCode: 4,
        message: 'Thiếu thông tin bắt buộc: tên lớp học phần, lớp hành chính, phòng.'
      };
    }

    if (!Number.isInteger(thu) || thu < 2 || thu > 8) {
      await t.rollback();
      return { success: false, errCode: 5, message: 'Thứ học không hợp lệ (chỉ nhận từ 2 đến 8).' };
    }

    if (!Number.isInteger(tiet_bat_dau) || tiet_bat_dau <= 0) {
      await t.rollback();
      return { success: false, errCode: 6, message: 'Tiết bắt đầu không hợp lệ.' };
    }

    if (!Number.isInteger(so_tiet) || so_tiet <= 0) {
      await t.rollback();
      return { success: false, errCode: 7, message: 'Số tiết không hợp lệ.' };
    }

    if (!['LT', 'TH'].includes(loai_hoc_phan)) {
      await t.rollback();
      return { success: false, errCode: 8, message: 'Loại học phần không hợp lệ (LT hoặc TH).' };
    }

    if (tuan_hoc.length === 0) {
      await t.rollback();
      return { success: false, errCode: 9, message: 'Tuần học không hợp lệ. Vui lòng nhập dạng 1,2,3.' };
    }

    lopHocPhan.ten_lophocphan = ten_lophocphan;
    lopHocPhan.ma_lop = ma_lop;
    lopHocPhan.phong = phong;
    lopHocPhan.thu = thu;
    lopHocPhan.tiet_bat_dau = tiet_bat_dau;
    lopHocPhan.so_tiet = so_tiet;
    lopHocPhan.tuan_hoc = tuan_hoc;
    lopHocPhan.loai_hoc_phan = loai_hoc_phan;

    await lopHocPhan.save({ transaction: t });

    if (lop_hanhchinh_ids.length > 0) {
      await lopHocPhan.setDanhSachLopHanhChinh(lop_hanhchinh_ids, { transaction: t });
    }

    await t.commit();

    const updated = await db.LopHocPhan.findByPk(lophocphan_id, {
      include: [
        {
          model: db.LopHanhChinh,
          as: 'DanhSachLopHanhChinh',
          attributes: ['lop_hanhchinh_id', 'ten_lop'],
          through: { attributes: [] }
        }
      ]
    });

    return {
      success: true,
      errCode: 0,
      message: 'Cập nhật thông tin lớp học phần thành công.',
      data: updated ? updated.toJSON() : lopHocPhan.toJSON()
    };
  } catch (error) {
    await t.rollback();
    throw new Error(`Lỗi cập nhật lớp học phần: ${error.message}`);
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
  const parseExcelOrder = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const normalized = value.toString().trim();
    if (!normalized) return null;
    const numeric = Number(normalized);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : NaN;
  };

  // Kiểm tra lớp học phần
  const lhp = await db.LopHocPhan.findByPk(lophocphan_id);
  if (!lhp) throw new Error("Lớp học phần không tồn tại.");

  // Đọc file
  const workbook = xlsx.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headerRow = rows[10] || [];
  const firstHeaderCell = headerRow[0]?.toString().trim().toLowerCase() || "";
  const hasSttColumn = firstHeaderCell === "stt" || firstHeaderCell.includes("thứ tự") || firstHeaderCell.includes("thu tu");

  const dataRows = rows.slice(11); // Bắt đầu từ dòng 12
  const errors = [];
  const validData = [];

  // --- BƯỚC 1: VALIDATE VÀ CHUẨN HÓA TOÀN BỘ ---
  dataRows.forEach((row, index) => {
    const rowIndex = index + 12;
    const parsedStt = hasSttColumn ? parseExcelOrder(row[0]) : null;

    const maSvRaw = hasSttColumn ? row[1] : row[0];
    const hoTenRaw = hasSttColumn ? row[2] : row[1];
    const lopRaw = hasSttColumn ? row[3] : row[2];
    const raw_ngay_sinh = hasSttColumn ? row[4] : row[3];
    const sdtRaw = hasSttColumn ? row[6] : row[5];

    if (!maSvRaw && !hoTenRaw) return; // Bỏ qua dòng trống

    const ma_sv = maSvRaw?.toString().trim();
    const ho_ten = hoTenRaw?.toString().trim();
    const ten_lop_hc = lopRaw?.toString().trim() || "Lớp tự do";
    const sdt = sdtRaw?.toString().trim() || null;
    const displayRef = parsedStt !== null && !Number.isNaN(parsedStt)
      ? `(STT ${parsedStt}, dòng ${rowIndex})`
      : `(dòng ${rowIndex})`;

    // Chuẩn hóa ngày sinh
    const clean_ngay_sinh = normalizeDate(raw_ngay_sinh);

    // Validate dữ liệu
    if (parsedStt !== null && Number.isNaN(parsedStt)) {
      errors.push(`Dòng ${rowIndex}: STT '${row[0]}' không hợp lệ (phải là số nguyên dương).`);
    }

    if (raw_ngay_sinh && !clean_ngay_sinh) {
      errors.push(`Ngày sinh '${raw_ngay_sinh}' không đúng định dạng ${displayRef} (Yêu cầu: DD/MM/YYYY).`);
    }

    if (!ma_sv) {
      errors.push(`Thiếu Mã sinh viên ${displayRef}.`);
    }

    if (!ho_ten) {
      errors.push(`Thiếu Họ tên ${displayRef}.`);
    }

    validData.push({
      stt: Number.isNaN(parsedStt) ? null : parsedStt,
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

const getSinhVienTheoLopHanhChinh = async (lophocphan_id, lop_hanhchinh_id) => {
  try {
    const lopHocPhan = await db.LopHocPhan.findByPk(lophocphan_id, {
      attributes: ['lophocphan_id']
    });

    if (!lopHocPhan) {
      return { success: false, errCode: 1, message: 'Lớp học phần không tồn tại.' };
    }

    const lopHanhChinh = await db.LopHanhChinh.findByPk(lop_hanhchinh_id, {
      attributes: ['lop_hanhchinh_id', 'ten_lop']
    });

    if (!lopHanhChinh) {
      return { success: false, errCode: 2, message: 'Lớp hành chính không tồn tại.' };
    }

    const sinhVienList = await db.SinhVien.findAll({
      where: {
        lop_hanhchinh_id,
        isDeleted: false
      },
      attributes: ['sinhvien_id', 'ma_sv', 'ten', 'email', 'sdt', 'ngaysinh'],
      order: [['ten', 'ASC']]
    });

    const sinhVienIds = sinhVienList.map((sv) => sv.sinhvien_id);
    const existedDangKy = await db.DangKyHoc.findAll({
      where: {
        lophocphan_id,
        sinhvien_id: { [Op.in]: sinhVienIds }
      },
      attributes: ['sinhvien_id']
    });
    const existedSet = new Set(existedDangKy.map((dk) => dk.sinhvien_id));

    return {
      success: true,
      errCode: 0,
      message: 'OK',
      data: {
        lop_hanhchinh: {
          lop_hanhchinh_id: lopHanhChinh.lop_hanhchinh_id,
          ten_lop: lopHanhChinh.ten_lop
        },
        students: sinhVienList.map((sv) => ({
          ...sv.toJSON(),
          da_dang_ky: existedSet.has(sv.sinhvien_id)
        }))
      }
    };
  } catch (error) {
    throw new Error(`Lỗi lấy sinh viên theo lớp hành chính: ${error.message}`);
  }
};

const addSinhVienTuLopHanhChinh = async (lophocphan_id, lop_hanhchinh_id, sinhvien_ids = []) => {
  const t = await db.sequelize.transaction();
  try {
    const lopHocPhan = await db.LopHocPhan.findByPk(lophocphan_id, {
      attributes: ['lophocphan_id'],
      transaction: t
    });

    if (!lopHocPhan) {
      await t.rollback();
      return { success: false, errCode: 1, message: 'Lớp học phần không tồn tại.' };
    }

    const normalizedIds = Array.isArray(sinhvien_ids)
      ? [...new Set(sinhvien_ids.filter(Boolean))]
      : [];

    if (normalizedIds.length === 0) {
      await t.rollback();
      return { success: false, errCode: 2, message: 'Vui lòng chọn ít nhất một sinh viên.' };
    }

    const sinhVienWhere = {
      sinhvien_id: { [Op.in]: normalizedIds },
      isDeleted: false
    };
    if (lop_hanhchinh_id) {
      sinhVienWhere.lop_hanhchinh_id = lop_hanhchinh_id;
    }

    const sinhVienList = await db.SinhVien.findAll({
      where: sinhVienWhere,
      attributes: ['sinhvien_id', 'lop_hanhchinh_id'],
      transaction: t
    });

    if (sinhVienList.length !== normalizedIds.length) {
      await t.rollback();
      return { success: false, errCode: 3, message: 'Một số sinh viên không hợp lệ hoặc không thuộc lớp hành chính đã chọn.' };
    }

    let addedCount = 0;
    let existedCount = 0;

    for (const sv of sinhVienList) {
      const [dangKy, created] = await db.DangKyHoc.findOrCreate({
        where: {
          lophocphan_id,
          sinhvien_id: sv.sinhvien_id
        },
        defaults: {
          dangky_id: crypto.randomUUID(),
          trangthai: 'active'
        },
        transaction: t
      });

      if (!created && dangKy.trangthai !== 'active') {
        await dangKy.update({ trangthai: 'active' }, { transaction: t });
      }

      if (created) addedCount += 1;
      else existedCount += 1;

      if (sv.lop_hanhchinh_id) {
        await db.LHP_LHC.findOrCreate({
          where: {
            lophocphan_id,
            lop_hanhchinh_id: sv.lop_hanhchinh_id
          },
          transaction: t
        });
      }
    }

    await t.commit();
    return {
      success: true,
      errCode: 0,
      message: 'Thêm sinh viên vào lớp học phần thành công.',
      data: {
        total: normalizedIds.length,
        added: addedCount,
        existed: existedCount
      }
    };
  } catch (error) {
    await t.rollback();
    throw new Error(`Lỗi thêm sinh viên từ lớp hành chính: ${error.message}`);
  }
};

const removeSinhVienKhoiLopHocPhan = async (lophocphan_id, sinhvien_id) => {
  const t = await db.sequelize.transaction();
  try {
    const lopHocPhan = await db.LopHocPhan.findByPk(lophocphan_id, {
      attributes: ['lophocphan_id'],
      transaction: t
    });

    if (!lopHocPhan) {
      await t.rollback();
      return { success: false, errCode: 1, message: 'Lớp học phần không tồn tại.' };
    }

    const dangKy = await db.DangKyHoc.findOne({
      where: { lophocphan_id, sinhvien_id },
      attributes: ['dangky_id'],
      transaction: t
    });

    if (!dangKy) {
      await t.rollback();
      return { success: false, errCode: 2, message: 'Sinh viên không thuộc lớp học phần này.' };
    }

    const buoiHocList = await db.BuoiHoc.findAll({
      where: { lophocphan_id },
      attributes: ['buoi_id'],
      transaction: t
    });
    const buoiIds = buoiHocList.map((item) => item.buoi_id);

    let deletedAttendanceCount = 0;
    if (buoiIds.length > 0) {
      deletedAttendanceCount = await db.DiemDanh.destroy({
        where: {
          buoi_id: { [Op.in]: buoiIds },
          sinhvien_id
        },
        transaction: t
      });
    }

    await db.DangKyHoc.destroy({
      where: { lophocphan_id, sinhvien_id },
      transaction: t
    });

    await t.commit();
    return {
      success: true,
      errCode: 0,
      message: 'Đã gỡ sinh viên khỏi lớp học phần thành công.',
      data: {
        deleted_attendance_count: deletedAttendanceCount
      }
    };
  } catch (error) {
    await t.rollback();
    throw new Error(`Lỗi gỡ sinh viên khỏi lớp học phần: ${error.message}`);
  }
};

module.exports = {
  getStudentsByLopHocPhan,
  getAllLopHocPhan,
  updateLopHocPhanInfo,
  getAllLopHocLai,
  getSinhVienByLopHocLai,
  importSinhVienFromExcel,
  getDanhSachSinhVien,
  getSinhVienTheoLopHanhChinh,
  addSinhVienTuLopHanhChinh,
  removeSinhVienKhoiLopHocPhan
};
