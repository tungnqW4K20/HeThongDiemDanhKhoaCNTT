'use strict';
const db = require('../models');
const { Op } = require('sequelize'); // Cần import Op để dùng cho truy vấn ngày tháng
const { HocKy, MonHoc, GiangVien, LopHanhChinh, LopHocPhan, BuoiHoc, LHP_LHC } = db;
const xlsx = require('xlsx');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);



// const getLichGiangDay = async (giangvien_id, hocky_id) => {
//   try {
//     const lichHoc = await BuoiHoc.findAll({
//       // 1. Chỉ lấy những buổi học thuộc về các Lớp học phần của giảng viên này trong học kỳ này
//       include: [
//         {
//           model: LopHocPhan,
//           as: 'LopHocPhan',
//           where: { giangvien_id, hocky_id },
//           attributes: ['lophocphan_id', 'ten_lophocphan', 'thu', 'tiet_bat_dau', 'so_tiet', 'phong', 'loai_hoc_phan'],
//           include: [
//             {
//               model: MonHoc,
//               attributes: ['ma_mon', 'ten_mon']
//             },
//             {
//               // ĐÂY LÀ CHỖ XEM DẠY LỚP HÀNH CHÍNH NÀO
//               model: LopHanhChinh,
//               as: 'DanhSachLopHanhChinh',
//               attributes: ['lop_hanhchinh_id', 'ten_lop'],
//               through: { attributes: [] } // Ẩn bảng trung gian
//             }
//           ]
//         },
//         {
//           // Lấy thêm thông tin giảng viên dạy thay nếu có
//           model: GiangVien,
//           as: 'GVDayThay',
//           attributes: ['ho', 'ten', 'ma_gv']
//         }
//       ],
//       attributes: ['buoi_id', 'ngay', 'trangthai', 'ghi_chu'],
//       // Sắp xếp theo ngày học tăng dần
//       order: [['ngay', 'ASC'], [{ model: LopHocPhan, as: 'LopHocPhan' }, 'tiet_bat_dau', 'ASC']]
//     });

//     // 2. Format lại dữ liệu cho Frontend dễ đọc
//     return lichHoc.map(buoi => {
//       const lhp = buoi.LopHocPhan;
//       return {
//         buoi_id: buoi.buoi_id,
//         ngay_hoc: buoi.ngay,
//         trang_thai: buoi.trangthai,
//         tiet_bat_dau: lhp.tiet_bat_dau,
//         so_tiet: lhp.so_tiet,
//         phong_hoc: buoi.phong_thay_doi || lhp.phong, // Ưu tiên phòng thay đổi nếu có
//         ten_mon: lhp.MonHoc.ten_mon,
//         loai: lhp.loai_hoc_phan,
//         // HIỂN THỊ CÁC LỚP HÀNH CHÍNH (Xử lý cả lớp ghép)
//         cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh.map(lhc => lhc.ten_lop).join(', '),
//         ghi_chu: buoi.ghi_chu,
//         gv_day_thay: buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null
//       };
//     });

//   } catch (error) {
//     console.error("Lỗi truy vấn lịch chi tiết:", error);
//     throw error;
//   }
// };
const getLichGiangDay = async (giangvien_id, hocky_id) => {
  try {
    const lichHoc = await db.BuoiHoc.findAll({
      where: {
        [Op.or]: [
          // Trường hợp 1: Bạn là giảng viên được chỉ định dạy thay cho buổi này
          { giangvien_day_thay_id: giangvien_id },
          
          // Trường hợp 2: Bạn là giảng viên chính (dù có hay không có người dạy thay)
          { '$LopHocPhan.giangvien_id$': giangvien_id }
        ]
      },
      include: [
        {
          model: db.LopHocPhan,
          as: 'LopHocPhan',
          where: { hocky_id }, // Vẫn lọc theo học kỳ
          required: true, // INNER JOIN để đảm bảo buổi học phải thuộc về một lớp học phần hợp lệ
          attributes: ['lophocphan_id', 'ten_lophocphan', 'thu', 'phong', 'loai_hoc_phan', 'giangvien_id', 'tiet_bat_dau', 'so_tiet' ],// thêm 'tiet_bat_dau' và 'so_tiet'
          include: [
            {
              model: db.MonHoc,
              attributes: ['ma_mon', 'ten_mon']
            },
            {
              model: db.LopHanhChinh,
              as: 'DanhSachLopHanhChinh',
              attributes: ['lop_hanhchinh_id', 'ten_lop'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: db.GiangVien,
          as: 'GVDayThay',
          attributes: ['ho', 'ten', 'ma_gv']
        }
      ],
      attributes: ['buoi_id', 'ngay', 'trangthai', 'ghi_chu', 'tiet_bat_dau', 'so_tiet', 'phong', 'is_override', 'giangvien_day_thay_id'],
      order: [['ngay', 'ASC'], ['tiet_bat_dau', 'ASC']]
    });

    // Format lại dữ liệu đầu ra (Giữ nguyên cấu trúc của bạn)
    return lichHoc.map(buoi => {
      const lhp = buoi.LopHocPhan;
      const isSubstitute = !!(buoi.giangvien_day_thay_id && lhp?.giangvien_id && buoi.giangvien_day_thay_id !== lhp.giangvien_id);
      const isMySubstituteSession = isSubstitute && buoi.giangvien_day_thay_id === giangvien_id;
      return {
        buoi_id: buoi.buoi_id,
        ngay_hoc: buoi.ngay,
        trang_thai: buoi.trangthai,
        tiet_bat_dau: buoi.tiet_bat_dau !== null ? buoi.tiet_bat_dau : lhp.tiet_bat_dau, // Handle null từ database
        so_tiet: buoi.so_tiet !== null ? buoi.so_tiet : lhp.so_tiet,
        phong_hoc: buoi.phong || lhp.phong,
        ten_mon: lhp.MonHoc ? lhp.MonHoc.ten_mon : lhp.ten_lophocphan,
        loai: lhp.loai_hoc_phan,
        cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh 
          ? lhp.DanhSachLopHanhChinh.map(lhc => lhc.ten_lop).join(', ') 
          : '',
        ghi_chu: buoi.ghi_chu,
        // Chỉ coi là dạy thay khi khác giảng viên chính của lớp học phần
        gv_day_thay: isSubstitute && buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null,
        giangvien_day_thay_id: buoi.giangvien_day_thay_id || null,
        has_substitute: isSubstitute,
        is_my_substitute_session: isMySubstituteSession,
        lophocphan_id: lhp?.lophocphan_id,
        is_override: buoi.is_override || false // Đánh dấu buổi được mở lại bởi admin
      };
    });

  } catch (error) {
    console.error("Lỗi truy vấn lịch chi tiết:", error);
    throw error;
  }
};

//lay lich hom nay ngay mai cua giang vien
// const getLichTheoNgay = async (giangvien_id, startDate, endDate) => {
//   try {
//     const data = await db.BuoiHoc.findAll({
//       where: {
//         ngay: {
//           [Op.between]: [startDate, endDate] // Lấy trong khoảng từ hôm nay đến ngày mai
//         }
//       },
//       attributes: ['buoi_id', 'ngay', 'trangthai', 'ghi_chu', 'tiet_bat_dau', 'so_tiet'],
//       include: [
//         {
//           model: db.LopHocPhan,
//           as: 'LopHocPhan', // Alias phải khớp với Model
//           where: { giangvien_id },
//           required: true, // INNER JOIN: Chỉ lấy những buổi thuộc về giảng viên này
//           attributes: ['lophocphan_id', 'ten_lophocphan', 'phong', 'thu', 'loai_hoc_phan'],
//           include: [
//             {
//               model: db.MonHoc,
//               attributes: ['ten_mon', 'ma_mon']
//             },
//             {
//               model: db.LopHanhChinh,
//               as: 'DanhSachLopHanhChinh',
//               attributes: ['ten_lop'],
//               through: { attributes: [] }
//             }
//           ]
//         },
//         {
//           model: db.GiangVien,
//           as: 'GVDayThay', // Nếu có thông tin dạy thay
//           attributes: ['ho', 'ten']
//         }
//       ],
//       // Sắp xếp theo Ngày trước, sau đó đến Tiết bắt đầu
//       order: [
//         ['ngay', 'ASC'],
//         ['tiet_bat_dau', 'ASC']
//       ]
//     });

//     // "Phẳng hóa" dữ liệu để Frontend dễ xử lý
//     return data.map(buoi => {
//       const lhp = buoi.LopHocPhan;
//       return {
//         buoi_id: buoi.buoi_id,
//         ngay_hoc: buoi.ngay,
//         ten_mon: lhp.MonHoc ? lhp.MonHoc.ten_mon : lhp.ten_lophocphan,
//         phong: buoi.phong || lhp.phong,
//         tiet_bat_dau: buoi.tiet_bat_dau,
//         so_tiet: buoi.so_tiet,
//         loai: lhp.loai_hoc_phan,
//         trang_thai: buoi.trangthai,
//         // Xử lý lớp ghép: Nối tên các lớp hành chính lại
//         cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh.map(lhc => lhc.ten_lop).join(', '),
//         ghi_chu: buoi.ghi_chu,
//         gv_day_thay: buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null
//       };
//     });

//   } catch (error) {
//     console.error("Lỗi getLichTheoNgay (Today & Tomorrow):", error);
//     throw error;
//   }
// };


const getLichTheoNgay = async (giangvien_id, datesArray) => {
  try {
    const data = await db.BuoiHoc.findAll({
      where: {
        ngay: { [Op.in]: datesArray },
        [Op.or]: [
          // Trường hợp 1: Bạn là người dạy thay cho buổi này
          { giangvien_day_thay_id: giangvien_id },
          
          // Trường hợp 2: Bạn là giảng viên chính và buổi này chưa bị thay thế bởi người khác
          {
            [Op.and]: [
              { '$LopHocPhan.giangvien_id$': giangvien_id },
              { giangvien_day_thay_id: null } 
            ]
          }
        ]
      },
      attributes: [
        'buoi_id', 'ngay', 'trangthai', 'ghi_chu', 
        'tiet_bat_dau', 'so_tiet', 'phong', 'giangvien_day_thay_id'
      ],
      include: [
        {
          model: db.LopHocPhan,
          as: 'LopHocPhan',
          required: true, // INNER JOIN để đảm bảo chỉ lấy buổi học có lớp học phần
          attributes: ['lophocphan_id', 'ten_lophocphan', 'phong', 'thu', 'loai_hoc_phan', 'giangvien_id'], 
          include: [
            { 
              model: db.MonHoc, 
              attributes: ['ten_mon', 'ma_mon'] 
            },
            {
              model: db.LopHanhChinh,
              as: 'DanhSachLopHanhChinh',
              attributes: ['ten_lop'],
              through: { attributes: [] }
            }
          ]
        },
        {
          model: db.GiangVien,
          as: 'GVDayThay',
          attributes: ['ho', 'ten']
        }
      ],
      order: [
        ['ngay', 'ASC'], 
        ['tiet_bat_dau', 'ASC']
      ]
    });

    // Format đầu ra giữ nguyên cấu trúc yêu cầu
    return data.map(buoi => {
      const lhp = buoi.LopHocPhan;
      
      return {
        buoi_id: buoi.buoi_id,
        lophocphan_id: lhp.lophocphan_id,
        ngay_hoc: buoi.ngay,
        ten_mon: lhp.MonHoc ? lhp.MonHoc.ten_mon : lhp.ten_lophocphan,
        phong: buoi.phong || lhp.phong, // Ưu tiên phòng thay đổi ở BuoiHoc
        tiet_bat_dau: buoi.tiet_bat_dau !== null ? buoi.tiet_bat_dau : lhp.tiet_bat_dau,
        so_tiet: buoi.so_tiet !== null ? buoi.so_tiet : lhp.so_tiet,
        loai: lhp.loai_hoc_phan,
        trang_thai: buoi.trangthai,
        cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh 
          ? lhp.DanhSachLopHanhChinh.map(l => l.ten_lop).join(', ') 
          : '',
        ghi_chu: buoi.ghi_chu,
        gv_day_thay: buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null
      };
    });

  } catch (error) {
    console.error("Error in getLichTheoNgay:", error);
    throw error;
  }
};


const getLichTuanNay = async (giangvien_id, startDate, endDate) => {
  try {
    const data = await db.LopHocPhan.findAll({
      where: { giangvien_id },
      // ✅ THÊM ten_lophocphan
      attributes: [
        'lophocphan_id',
        'ten_lophocphan',
        'phong',
        'gio_batdau',
        'gio_ketthuc',
        'thu'
      ],
      include: [
        {
          model: db.MonHoc,
          attributes: ["ten_mon", "ma_mon"]
        },
        {
          model: db.HocKy,
          attributes: ["ten_hocky"]
        },
        {
          model: db.LopHanhChinh,
          attributes: ["ten_lop"],
          as: 'DanhSachLopHanhChinh', // ✅ SỬA ALIAS
          through: { attributes: [] }
        },
        {
          model: db.BuoiHoc,
          as: "DanhSachBuoiHoc",
          where: {
            ngay: {
              [Op.between]: [startDate, endDate] // ✅ Dùng Op.between
            }
          },
          attributes: ['buoi_id', 'ngay', 'batdau', 'ketthuc', 'trangthai'],
          required: true // ✅ Chỉ lấy lớp có lịch trong tuần
        }
      ],
      order: [
        ['ngay_tao', 'ASC'], // Hoặc order theo ngày của buổi học nếu cần xử lý thêm
        ["gio_batdau", "ASC"]
      ]
    });
    return data;
  } catch (error) {
    console.error("Lỗi getLichTuanNay:", error);
    throw error;
  }
};

// const getAllByHocKy = async (hocky_id, keyword = '') => {
//   try {
//     const hocKy = await db.HocKy.findByPk(hocky_id, {
//   attributes: ['hocky_id', 'ten_hocky', 'ngay_batdau', 'ngay_ketthuc']
// });
//     const rows = await db.BuoiHoc.findAll({
//       include: [
//         {
//           model: db.LopHocPhan,
//           as: 'LopHocPhan',
//           where: { hocky_id },
//           required: true, // Bắt buộc phải có LHP mới lấy BuoiHoc (Chống lỗi undefined)
//           attributes: ['lophocphan_id', 'ten_lophocphan', 'thu', 'tiet_bat_dau', 'so_tiet', 'phong', 'loai_hoc_phan'],
//           include: [
//             {
//               model: db.MonHoc,
//               attributes: ['ten_mon', 'ma_mon']
//             },
//             {
//               model: db.GiangVien,
//               attributes: ['ho', 'ten', 'ma_gv']
//             },
//             {
//               model: db.LopHanhChinh,
//               as: 'DanhSachLopHanhChinh',
//               attributes: ['lop_hanhchinh_id', 'ten_lop'],
//               through: { attributes: [] }
//             }
//           ]
//         },
//         {
//           model: db.GiangVien,
//           as: 'GVDayThay',
//           attributes: ['ho', 'ten']
//         }
//       ],
//       // Lọc theo từ khóa (Môn học hoặc Giảng viên)
//       where: keyword ? {
//         [Op.or]: [
//           { '$LopHocPhan.MonHoc.ten_mon$': { [Op.like]: `%${keyword}%` } },
//           { '$LopHocPhan.GiangVien.ten$': { [Op.like]: `%${keyword}%` } },
//           { ghi_chu: { [Op.like]: `%${keyword}%` } }
//         ]
//       } : {},
//       order: [
//         ['ngay', 'ASC'],
//         [{ model: db.LopHocPhan, as: 'LopHocPhan' }, 'tiet_bat_dau', 'ASC']
//       ]
//     });

//     return rows;
//   } catch (error) {
//     console.error("Lỗi service getAllTimelineByHocKy:", error);
//     throw error;
//   }
// };

const getAllByHocKy = async (hocky_id, keyword = '', target_khoa_id = null, target_chuyennganh_id = null) => {
  try {
    // Điều kiện lọc cho bảng Môn Học
    let monHocWhere = {};
    if (target_khoa_id) {
      monHocWhere.khoa_id = target_khoa_id;
    }
    if (target_chuyennganh_id) {
      monHocWhere[Op.or] = [
        { bomon_id: target_chuyennganh_id },
        { chuyennganh_id: target_chuyennganh_id }
      ];
    }

    const rows = await db.BuoiHoc.findAll({
      attributes: ['buoi_id', 'ngay', 'trangthai', 'ghi_chu', 'tiet_bat_dau', 'so_tiet', 'phong'],
      include: [
        {
          model: db.LopHocPhan,
          as: 'LopHocPhan',
          where: { hocky_id },
          required: true, 
          attributes: ['lophocphan_id', 'ten_lophocphan', 'thu', 'phong', 'loai_hoc_phan', 'monhoc_id', 'giangvien_id', 'hocky_id'],
          include: [
            {
              model: db.MonHoc,
              attributes: ['monhoc_id', 'ten_mon', 'ma_mon', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
              where: monHocWhere, // LỌC KHOA TẠI ĐÂY
              required: Object.keys(monHocWhere).length > 0
            },
            {
              model: db.GiangVien,
              attributes: ['giangvien_id', 'ho', 'ten', 'ma_gv']
            },
            {
              model: db.LopHanhChinh,
              as: 'DanhSachLopHanhChinh',
              attributes: ['lop_hanhchinh_id', 'ten_lop'],
              through: { attributes: [] },
              required: false
            }
          ]
        },
        {
          model: db.GiangVien,
          as: 'GVDayThay',
          attributes: ['ho', 'ten']
        }
      ],
      where: keyword ? {
        [Op.or]: [
          { '$LopHocPhan.MonHoc.ten_mon$': { [Op.like]: `%${keyword}%` } },
          { '$LopHocPhan.GiangVien.ten$': { [Op.like]: `%${keyword}%` } },
          { ghi_chu: { [Op.like]: `%${keyword}%` } }
        ]
      } : {},
      order: [['ngay', 'ASC'], ['tiet_bat_dau', 'ASC']]
    });

    return rows;
  } catch (error) {
    console.error("Lỗi service getAllTimelineByHocKy:", error);
    throw error;
  }
};

const getLichChiTiet = async ({ hocky_id, page, limit, fromDate, toDate, giangvien_id }) => {
  try {
    // 1. Xây dựng điều kiện lọc (Where clause)
    const whereCondition = {};

    // Nếu có lọc theo khoảng ngày (Ví dụ: xem lịch tuần này)
    if (fromDate && toDate) {
      whereCondition.ngay = {
        [Op.between]: [fromDate, toDate]
      };
    }

    // Nếu không lọc ngày thì bắt buộc phải theo học kỳ (để tránh query toàn bộ DB)
    // Lưu ý: hocky_id nằm ở bảng LopHocPhan, nên ta sẽ filter trong include

    // 2. Tính toán phân trang
    const _page = parseInt(page) || 1;
    const _limit = parseInt(limit) || 20;
    const offset = (_page - 1) * _limit;

    // 3. Query
    const { count, rows } = await db.BuoiHoc.findAndCountAll({
      where: whereCondition,
      limit: _limit,
      offset: offset,
      order: [
        ['ngay', 'ASC'],
        ['batdau', 'ASC']
      ],
      distinct: true, // Quan trọng để đếm đúng khi có include
      include: [
        {
          model: db.LopHocPhan,
          as: 'LopHocPhan',
          where: hocky_id ? { hocky_id } : undefined, // Lọc học kỳ tại đây
          // 🔥 TỐI ƯU: Chỉ lấy cột cần thiết
          attributes: ['lophocphan_id', 'ten_lophocphan', 'gio_batdau', 'gio_ketthuc', 'phong', 'thu'],
          include: [
            {
              model: db.MonHoc,
              attributes: ['ten_mon', 'ma_mon'] // Chỉ lấy tên và mã
            },
            {
              model: db.GiangVien,
              attributes: ['ho', 'ten', 'ma_gv'], // Chỉ lấy tên GV
              where: giangvien_id ? { giangvien_id } : undefined // Lọc theo GV nếu cần
            },
            {
              model: db.LopHanhChinh,
              as: 'DanhSachLopHanhChinh',
              attributes: ['ten_lop'],
              through: { attributes: [] } // Bỏ qua bảng trung gian
            }
          ]
        }
      ]
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / _limit),
      currentPage: _page,
      data: rows
    };

  } catch (error) {
    console.error("Lỗi service getLichChiTiet:", error);
    throw error;
  }
};




// HELPER: Chuẩn hóa dữ liệu đầu vào
const removeAccents = (str) => {
  if (!str) return "";
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const cleanStr = (val) => {
  if (val === undefined || val === null) return "";
  return val.toString().replace(/[\r\n\t]+/g, ' ').trim();
};

const splitName = (fullName) => {
  const cleaned = cleanStr(fullName);
  if (!cleaned) return { ho: ' ', ten: 'Chưa rõ' };
  const parts = cleaned.split(/\s+/);
  const ten = parts.pop();
  const ho = parts.join(' ');
  return { ho: ho || ' ', ten };
};

// LOGIC: Thứ 2 kế tiếp (Next Monday)
const calculateAnchorMonday = (startDate) => {
  const start = dayjs(startDate);
  const dayOfWeek = start.isoWeekday();
  if (dayOfWeek === 1) return start.format('YYYY-MM-DD');
  return start.add(8 - dayOfWeek, 'day').format('YYYY-MM-DD');
};

// const importScheduleExcel = async (buffer, hockyData) => {
//   const workbook = xlsx.read(buffer, { type: 'buffer' });
//   const sheet = workbook.Sheets[workbook.SheetNames[0]];
//   const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

//   // 1. DÒ TÌM HEADER & MAPPING (CHỐNG LỆCH CỘT)
//   let headerRowIndex = -1;
//   const coreKeywords = ["TUAN", "THU", "TIET", "LOP", "PHAN"];
//   for (let i = 0; i < Math.min(allRows.length, 30); i++) {
//     const rowContent = allRows[i].map(cell => removeAccents(cleanStr(cell).toUpperCase())).join(" ");
//     if (coreKeywords.every(kw => rowContent.includes(kw))) { headerRowIndex = i; break; }
//   }
//   if (headerRowIndex === -1) throw new Error('Không tìm thấy dòng tiêu đề hợp lệ trong file Excel.');

//   const header = allRows[headerRowIndex].map(c => removeAccents(cleanStr(c).toUpperCase()));
//   const f = (kw) => header.findIndex(c => c === kw || c.includes(kw));

//   const col = {
//     tuan: f("TUAN"), thu: f("THU"), tietBD: f("TIET BAT DAU"),
//     soTiet: header.findIndex((c, idx) => (c.includes("TIET") && !c.includes("BAT DAU")) || c === "SO TIET"),
//     phong: f("PHONG"), maLop: f("MA LOP"), hocPhan: f("HOC PHAN"),
//     maGV: f("MA GV"), tenGV: f("HO VA TEN GV"), gvThay: f("DAY THAY"),
//     sdtGV: f("DIEN THOAI"), chat: f("CHAT")
//   };

//   const t = await db.sequelize.transaction();
//   try {
//     const anchorMonday = calculateAnchorMonday(hockyData.ngay_batdau);
//     const [hocky] = await HocKy.findOrCreate({
//       where: { ten_hocky: cleanStr(hockyData.ten_hocky) },
//       defaults: { ngay_batdau: hockyData.ngay_batdau, ngay_ketthuc: hockyData.ngay_ketthuc, ngay_monday_tuan_1: hockyData.ngay_monday_tuan_1 },
//       transaction: t
//     });

//     const mapMonHoc = new Map(), mapGiangVien = new Map(), mapLopHC = new Map();
//     let monCount = await MonHoc.count({ transaction: t });
//     const dataRows = allRows.slice(headerRowIndex + 1);

//     // --- BƯỚC 1: ĐỒNG BỘ DANH MỤC (Môn, GV, Lớp HC) - CHỐNG TRÙNG DB ---
//     for (const row of dataRows) {
//       const tenMon = cleanStr(row[col.hocPhan]);
//       const rawMaLopStr = cleanStr(row[col.maLop]);
//       if (tenMon.length < 2 || !rawMaLopStr) continue;

//       // Môn học (Unique by Name)
//       if (!mapMonHoc.has(tenMon)) {
//         const [mon] = await MonHoc.findOrCreate({
//           where: { ten_mon: tenMon },
//           defaults: { ma_mon: `M${String(++monCount).padStart(3, '0')}`, sotinchi: 3 },
//           transaction: t
//         });
//         mapMonHoc.set(tenMon, mon.monhoc_id);
//       }

//       // Giảng viên (Unique by ma_gv) & Đồng bộ SDT
//       const maGV = cleanStr(row[col.maGV]);
//       const sdt = cleanStr(row[col.sdtGV]);
//       const fullGV = `${cleanStr(row[col.tenGV])} ${cleanStr(row[col.tenGV + 1])}`.trim();
//       if (maGV && !mapGiangVien.has(maGV)) {
//         const [gv, created] = await GiangVien.findOrCreate({
//           where: { ma_gv: maGV },
//           defaults: { ...splitName(fullGV), sdt: sdt },
//           transaction: t
//         });
//         // ÉP CẬP NHẬT SDT NẾU THAY ĐỔI
//         if (!created && sdt !== "" && gv.sdt !== sdt) await gv.update({ sdt }, { transaction: t });
//         mapGiangVien.set(maGV, gv.giangvien_id);
//         mapGiangVien.set(`NAME_${fullGV.toUpperCase()}`, gv.giangvien_id);
//       }

//       // Lớp Hành Chính (Tách lớp ghép, Unique by Name)
//       const listLopInRow = rawMaLopStr.split(/\s+/);
//       for (const name of listLopInRow) {
//         if (!mapLopHC.has(name)) {
//           const [lhc] = await LopHanhChinh.findOrCreate({ where: { ten_lop: name }, defaults: { nien_khoa: dayjs().year() }, transaction: t });
//           mapLopHC.set(name, lhc.lop_hanhchinh_id);
//         }
//       }
//     }

//     // --- BƯỚC 2: GOM NHÓM (CHỐNG TRÙNG TRONG EXCEL - TRƯỜNG HỢP TÁCH LỚP) ---
//     const groups = new Map();
//     dataRows.forEach(row => {
//       const tenMon = cleanStr(row[col.hocPhan]);
//       const rawMaLopStr = cleanStr(row[col.maLop]);
//       const maGV = cleanStr(row[col.maGV]);
//       const thu = parseInt(row[col.thu]);
//       const tietBD = parseInt(row[col.tietBD]);
//       const loai = cleanStr(row[col.chat] || "LT");

//       if (!tenMon || !rawMaLopStr || isNaN(thu) || isNaN(tietBD) || !maGV) return;

//       const monID = mapMonHoc.get(tenMon);
//       const gvID = mapGiangVien.get(maGV);
//       if (!monID || !gvID) return;

//       // FINGERPRINT: Bộ nhận diện duy nhất của một ca học thực tế
//       // Bỏ 'thu' để gom các lớp học nhiều thứ khác nhau thành 1 LHP
//       // Giữ nguyên tietBD, phong, loai để tách các ca học khác nhau
//       const fingerprint = `${monID}_${gvID}_${tietBD}_${loai}_${cleanStr(row[col.phong])}`;

//       if (!groups.has(fingerprint)) {
//         groups.set(fingerprint, {
//           monhoc_id: monID,
//           giangvien_id: gvID,
//           hocky_id: hocky.hocky_id,
//           ten_lophocphan: tenMon,
//           phong: cleanStr(row[col.phong]),
//           thu, tiet_bat_dau: tietBD,
//           so_tiet: parseInt(row[col.soTiet]) || 0,
//           loai_hoc_phan: loai,
//           // Lưu lại danh sách LHC để xử lý lớp ghép
//           lhc_names: rawMaLopStr.split(/\s+/),
//           rows: [row]
//         });
//       } else {
//         const g = groups.get(fingerprint);
//         g.rows.push(row);
//         // Đồng bộ số tiết nếu dòng sau mới có dữ liệu
//         if (g.so_tiet === 0) g.so_tiet = parseInt(row[col.soTiet]) || 0;
//       }
//     });

//     // --- BƯỚC 3: PERSISTENCE (LƯU DB & ÉP CẬP NHẬT THÔNG SỐ) ---
//     for (const [key, data] of groups) {
//       const weeksInExcel = [...new Set(data.rows.map(r => parseInt(r[col.tuan])))].sort((a, b) => a - b);

//       // 3.1 Xử lý Lớp học phần
//       const [lhp, created] = await LopHocPhan.findOrCreate({
//         where: {
//           hocky_id: hocky.hocky_id,
//           monhoc_id: data.monhoc_id,
//           giangvien_id: data.giangvien_id,
//           tiet_bat_dau: data.tiet_bat_dau,
//           phong: data.phong,
//           loai_hoc_phan: data.loai_hoc_phan
//         },
//         defaults: { ...data, tuan_hoc: weeksInExcel },
//         transaction: t
//       });

//       // 3.2 ÉP CẬP NHẬT SỐ TIẾT, PHÒNG VÀ GỘP TUẦN (CHỐNG MẤT DỮ LIỆU CŨ)
//       const mergedWeeks = [...new Set([...(lhp.tuan_hoc || []), ...weeksInExcel])].sort((a, b) => a - b);
//       await lhp.update({
//         tuan_hoc: mergedWeeks,
//         so_tiet: data.so_tiet > 0 ? data.so_tiet : lhp.so_tiet, // Giữ số tiết mới nhất
//         phong: data.phong
//       }, { transaction: t });

//       // 3.3 Xử lý liên kết Lớp ghép (LHP_LHC)
//       for (const name of data.lhc_names) {
//         const lhc_id = mapLopHC.get(name);
//         if (lhc_id) {
//           await LHP_LHC.findOrCreate({ where: { lophocphan_id: lhp.lophocphan_id, lop_hanhchinh_id: lhc_id }, transaction: t });
//         }
//       }

//       // 3.4 Sinh Buổi học cụ thể (Sessions)
//       const sessions = data.rows.map(row => {
//         const date = dayjs(hockyData.ngay_monday_tuan_1).add(parseInt(row[col.tuan]) - 1, 'week').add(parseInt(row[col.thu]) - 2, 'day').format('YYYY-MM-DD');
//         const fullThay = `${cleanStr(row[col.gvThay])} ${cleanStr(row[col.gvThay + 1])}`.trim();
//         return {
//           lophocphan_id: lhp.lophocphan_id, ngay: date,
//           trangthai: 'scheduled',
//           giangvien_day_thay_id: fullThay.length > 2 ? mapGiangVien.get(`NAME_${fullThay.toUpperCase()}`) : null
//         };
//       });
//       // Bulk upsert buổi học
//       await BuoiHoc.bulkCreate(sessions, { updateOnDuplicate: ['giangvien_day_thay_id'], transaction: t });
//     }

//     await t.commit();
//     return { success: true, countLHP: groups.size };
//   } catch (error) {
//     await t.rollback();
//     console.error("IMPORT ERROR LOG:", error);
//     throw error;
//   }
// };
const importScheduleExcel = async (buffer, hockyData) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // 1. DÒ TÌM HEADER & MAPPING (CHỐNG LỆCH CỘT)
  let headerRowIndex = -1;
  const coreKeywords = ["TUAN", "THU", "TIET", "LOP"];
  for (let i = 0; i < Math.min(allRows.length, 30); i++) {
    const rowContent = allRows[i].map(cell => removeAccents(cleanStr(cell).toUpperCase())).join(" ");
    const hasCore = coreKeywords.every(kw => rowContent.includes(kw));
    const hasSubjectColumn = rowContent.includes("HOC PHAN") || rowContent.includes("HOC P");
    if (hasCore && hasSubjectColumn) { headerRowIndex = i; break; }
  }
  if (headerRowIndex === -1) throw new Error('Không tìm thấy dòng tiêu đề hợp lệ trong file Excel.');

  const header = allRows[headerRowIndex].map(c => removeAccents(cleanStr(c).toUpperCase()));
  const f = (kw, aliases = []) => {
    const index = header.findIndex(c => c === kw || c.includes(kw));
    if (index !== -1) return index;
    for (const alias of aliases) {
      const aliasIndex = header.findIndex(c => c === alias || c.includes(alias));
      if (aliasIndex !== -1) return aliasIndex;
    }
    return -1;
  };

  const col = {
    tuan: f("TUAN"), thu: f("THU"), tietBD: f("TIET BAT DAU"),
    soTiet: header.findIndex((c, idx) => (c.includes("TIET") && !c.includes("BAT DAU")) || c === "SO TIET"),
    phong: f("PHONG"), maLop: f("MA LOP"), hocPhan: f("HOC PHAN", ["TEN HOC P", "HOC P", "TEN HOC PHAN"]),
    maGV: f("MA GV"),
    tenGV: f("HO VA TEN GV"),
    gvThay: f("HO VA TEN GV DAY THAY", ["GV DAY THAY", "DAY THAY", "DAY THAY GV"]),
    sdtGV: f("DIEN THOAI"), chat: f("CHAT"),
    khoa: f("KHOA"),
    boMon: f("BO MON")
  };

  const isTenGVSplitAcrossTwoCols = col.tenGV >= 0 && cleanStr(header[col.tenGV + 1]) === '';
  const isGVThaySplitAcrossTwoCols = col.gvThay >= 0 && cleanStr(header[col.gvThay + 1]) === '';

  const t = await db.sequelize.transaction();
  try {
      const targetBoMonId = cleanStr(hockyData.selected_bomon_id || '');
      const shouldFilterByBoMon = !!targetBoMonId;

      // Nếu có hocky_id, dùng trực tiếp — tránh tạo học kỳ mới do tên không khớp chính xác
      let hocky;
      if (hockyData.hocky_id) {
        hocky = await HocKy.findByPk(hockyData.hocky_id, { transaction: t });
        if (!hocky) throw new Error(`Không tìm thấy học kỳ với id: ${hockyData.hocky_id}`);
      } else {
        const anchorMonday = calculateAnchorMonday(hockyData.ngay_batdau);
        [hocky] = await HocKy.findOrCreate({
          where: { ten_hocky: cleanStr(hockyData.ten_hocky) },
          defaults: { ngay_batdau: hockyData.ngay_batdau, ngay_ketthuc: hockyData.ngay_ketthuc, ngay_monday_tuan_1: hockyData.ngay_monday_tuan_1 },
          transaction: t
        });
      }
    let monCount = await MonHoc.count({ transaction: t });
    let chuyenNganhCount = await db.ChuyenNganh.count({ transaction: t });
    const dataRows = allRows.slice(headerRowIndex + 1);
    const mapMonHoc = new Map(), mapGiangVien = new Map(), mapLopHC = new Map();
    const mapKhoa = new Map();
    const mapBoMonByKhoa = new Map();
    const mapBoMonGlobal = new Map();

    const normalizeLookup = (val) => removeAccents(cleanStr(val).toUpperCase());

    const allKhoa = await db.Khoa.findAll({
      attributes: ['khoa_id', 'ma_khoa', 'ten_khoa'],
      transaction: t
    });
    allKhoa.forEach((k) => {
      const ma = normalizeLookup(k.ma_khoa);
      const ten = normalizeLookup(k.ten_khoa);
      if (ma) mapKhoa.set(ma, k.khoa_id);
      if (ten) mapKhoa.set(ten, k.khoa_id);
    });

    const allBoMon = await db.ChuyenNganh.findAll({
      attributes: ['chuyennganh_id', 'khoa_id', 'ma_chuyennganh', 'ten_chuyennganh'],
      transaction: t
    });
    allBoMon.forEach((bm) => {
      const ma = normalizeLookup(bm.ma_chuyennganh);
      const ten = normalizeLookup(bm.ten_chuyennganh);
      if (ma) {
        mapBoMonByKhoa.set(`${bm.khoa_id}__${ma}`, bm.chuyennganh_id);
        if (!mapBoMonGlobal.has(ma)) mapBoMonGlobal.set(ma, bm.chuyennganh_id);
      }
      if (ten) {
        mapBoMonByKhoa.set(`${bm.khoa_id}__${ten}`, bm.chuyennganh_id);
        if (!mapBoMonGlobal.has(ten)) mapBoMonGlobal.set(ten, bm.chuyennganh_id);
      }
    });

    // --- BƯỚC 1: ĐỒNG BỘ DANH MỤC (Môn, GV, Lớp HC) - CHỐNG TRÙNG DB ---
    for (const row of dataRows) {
      const tenMon = cleanStr(row[col.hocPhan]);
      const rawMaLopStr = cleanStr(row[col.maLop]);
      const khoaRaw = col.khoa >= 0 ? cleanStr(row[col.khoa]) : '';
      const boMonRaw = col.boMon >= 0 ? cleanStr(row[col.boMon]) : '';
      const khoaId = khoaRaw ? (mapKhoa.get(normalizeLookup(khoaRaw)) || null) : null;

      let boMonId = null;
      if (boMonRaw) {
        const normalizedBoMon = normalizeLookup(boMonRaw);
        if (khoaId) {
          boMonId = mapBoMonByKhoa.get(`${khoaId}__${normalizedBoMon}`) || null;
        }
        if (!boMonId) {
          boMonId = mapBoMonGlobal.get(normalizedBoMon) || null;
        }

        if (!boMonId && khoaId) {
          const [createdBoMon] = await db.ChuyenNganh.findOrCreate({
            where: {
              khoa_id: khoaId,
              ten_chuyennganh: boMonRaw
            },
            defaults: {
              ma_chuyennganh: `BM${String(++chuyenNganhCount).padStart(4, '0')}`,
              mota: 'Tạo tự động từ import lịch dạy'
            },
            transaction: t
          });
          boMonId = createdBoMon.chuyennganh_id;
          mapBoMonByKhoa.set(`${khoaId}__${normalizedBoMon}`, boMonId);
          if (!mapBoMonGlobal.has(normalizedBoMon)) {
            mapBoMonGlobal.set(normalizedBoMon, boMonId);
          }
        }
      }

      if (shouldFilterByBoMon && boMonId !== targetBoMonId) continue;

      if (tenMon.length < 2 || !rawMaLopStr) continue;

      // Môn học (Unique by Name)
      if (!mapMonHoc.has(tenMon)) {
        const [mon] = await MonHoc.findOrCreate({
          where: { ten_mon: tenMon },
          defaults: {
            ma_mon: `M${String(++monCount).padStart(3, '0')}`,
            sotinchi: 3,
            khoa_id: khoaId,
            chuyennganh_id: boMonId
          },
          transaction: t
        });

        const patchPayload = {};
        if (khoaId && !mon.khoa_id) patchPayload.khoa_id = khoaId;
        if (boMonId && !mon.chuyennganh_id) patchPayload.chuyennganh_id = boMonId;
        if (Object.keys(patchPayload).length > 0) {
          await mon.update(patchPayload, { transaction: t });
        }

        mapMonHoc.set(tenMon, mon.monhoc_id);
      }

      // Giảng viên (Unique by ma_gv) & Đồng bộ SDT
      const maGV = cleanStr(row[col.maGV]);
      const sdt = cleanStr(row[col.sdtGV]);
      const fullGV = isTenGVSplitAcrossTwoCols
        ? `${cleanStr(row[col.tenGV])} ${cleanStr(row[col.tenGV + 1])}`.trim()
        : cleanStr(row[col.tenGV]);
      if (maGV && !mapGiangVien.has(maGV)) {
        const [gv, created] = await GiangVien.findOrCreate({
          where: { ma_gv: maGV },
          defaults: { ...splitName(fullGV), sdt: sdt },
          transaction: t
        });
        // ÉP CẬP NHẬT SDT NẾU THAY ĐỔI
        if (!created && sdt !== "" && gv.sdt !== sdt) await gv.update({ sdt }, { transaction: t });
        mapGiangVien.set(maGV, gv.giangvien_id);
        mapGiangVien.set(`NAME_${fullGV.toUpperCase()}`, gv.giangvien_id);
      }

      // Lớp Hành Chính (Tách lớp ghép, Unique by Name)
      const listLopInRow = rawMaLopStr.split(/\s+/);
      for (const name of listLopInRow) {
        if (!mapLopHC.has(name)) {
          const [lhc] = await LopHanhChinh.findOrCreate({
            where: { ten_lop: name },
            defaults: {
              nien_khoa: dayjs().year(),
              khoa_id: khoaId,
              chuyennganh_id: boMonId
            },
            transaction: t
          });

          const patchPayload = {};
          if (khoaId && !lhc.khoa_id) patchPayload.khoa_id = khoaId;
          if (boMonId && !lhc.chuyennganh_id) patchPayload.chuyennganh_id = boMonId;
          if (Object.keys(patchPayload).length > 0) {
            await lhc.update(patchPayload, { transaction: t });
          }

          mapLopHC.set(name, lhc.lop_hanhchinh_id);
        }
      }
    }

    // --- BƯỚC 2: GOM NHÓM (CHỐNG TRÙNG TRONG EXCEL - TRƯỜNG HỢP TÁCH LỚP) ---
    const groups = new Map();
    dataRows.forEach(row => {
      const tenMon = cleanStr(row[col.hocPhan]);
      const rawMaLopStr = cleanStr(row[col.maLop]);
      const khoaRaw = col.khoa >= 0 ? cleanStr(row[col.khoa]) : '';
      const boMonRaw = col.boMon >= 0 ? cleanStr(row[col.boMon]) : '';
      const maGV = cleanStr(row[col.maGV]);
      const thu = parseInt(row[col.thu]);
      const tietBD = parseInt(row[col.tietBD]);
      const loai = cleanStr(row[col.chat] || "LT");

      const khoaId = khoaRaw ? (mapKhoa.get(normalizeLookup(khoaRaw)) || null) : null;
      let rowBoMonId = null;
      if (boMonRaw) {
        const normalizedBoMon = normalizeLookup(boMonRaw);
        if (khoaId) {
          rowBoMonId = mapBoMonByKhoa.get(`${khoaId}__${normalizedBoMon}`) || null;
        }
        if (!rowBoMonId) {
          rowBoMonId = mapBoMonGlobal.get(normalizedBoMon) || null;
        }
      }
      if (shouldFilterByBoMon && rowBoMonId !== targetBoMonId) return;

      if (!tenMon || !rawMaLopStr || isNaN(thu) || isNaN(tietBD) || !maGV) return;

      const monID = mapMonHoc.get(tenMon);
      const gvID = mapGiangVien.get(maGV);
      if (!monID || !gvID) return;

      // FINGERPRINT: Bộ nhận diện duy nhất của một lớp học phần
      // Bỏ 'thu', 'tietBD', và 'phong' để gom các lớp học nhiều thứ/tiết/phòng khác nhau thành 1 LHP
      // Giữ monID, gvID, loai, và maLop để tách các lớp học phần khác nhau
      const fingerprint = `${monID}_${gvID}_${loai}_${rawMaLopStr}`;

      if (!groups.has(fingerprint)) {
        groups.set(fingerprint, {
          monhoc_id: monID,
          giangvien_id: gvID,
          hocky_id: hocky.hocky_id,
          ten_lophocphan: tenMon,
          phong: cleanStr(row[col.phong]),
          thu,
          tiet_bat_dau: tietBD,
          tiet_bat_dau_list: [tietBD], // Lưu tất cả các tiết bắt đầu để lấy min
          so_tiet: parseInt(row[col.soTiet]) || 0,
          loai_hoc_phan: loai,
          // Lưu lại danh sách LHC để xử lý lớp ghép
          lhc_names: rawMaLopStr.split(/\s+/),
          rows: [row]
        });
      } else {
        const g = groups.get(fingerprint);
        g.rows.push(row);
        // Lưu tiết bắt đầu để tìm min
        if (!g.tiet_bat_dau_list.includes(tietBD)) {
          g.tiet_bat_dau_list.push(tietBD);
        }
        // Cập nhật tiết bắt đầu sớm nhất
        g.tiet_bat_dau = Math.min(g.tiet_bat_dau, tietBD);
        // Đồng bộ số tiết nếu dòng sau mới có dữ liệu
        if (g.so_tiet === 0) g.so_tiet = parseInt(row[col.soTiet]) || 0;
      }
    });

    // --- BƯỚC 3: PERSISTENCE (LƯU DB & ÉP CẬP NHẬT THÔNG SỐ) ---
    for (const [key, data] of groups) {
      const weeksInExcel = [...new Set(data.rows.map(r => parseInt(r[col.tuan])))].sort((a, b) => a - b);
      // Extract ma_lop from fingerprint key (format: monID_gvID_loai_maLop)
      const maLop = key.split('_').slice(3).join('_');

      // 3.1 Xử lý Lớp học phần
      const [lhp, created] = await LopHocPhan.findOrCreate({
        where: {
          hocky_id: hocky.hocky_id,
          monhoc_id: data.monhoc_id,
          giangvien_id: data.giangvien_id,
          loai_hoc_phan: data.loai_hoc_phan,
          ma_lop: maLop // Thêm mã lớp vào where để tránh merge các lớp khác nhau
        },
        defaults: { ...data, tuan_hoc: weeksInExcel, ma_lop: maLop },
        transaction: t
      });

      // 3.2 ÉP CẬP NHẬT SỐ TIẾT, PHÒNG VÀ GỘP TUẦN (CHỐNG MẤT DỮ LIỆU CŨ)
      const mergedWeeks = [...new Set([...(lhp.tuan_hoc || []), ...weeksInExcel])].sort((a, b) => a - b);
      await lhp.update({
        tuan_hoc: mergedWeeks,
        so_tiet: data.so_tiet > 0 ? data.so_tiet : lhp.so_tiet, // Giữ số tiết mới nhất
        phong: data.phong
      }, { transaction: t });

      // 3.3 Xử lý liên kết Lớp ghép (LHP_LHC)
      for (const name of data.lhc_names) {
        const lhc_id = mapLopHC.get(name);
        if (lhc_id) {
          await LHP_LHC.findOrCreate({ where: { lophocphan_id: lhp.lophocphan_id, lop_hanhchinh_id: lhc_id }, transaction: t });
        }
      }

      // 3.4 Sinh Buổi học cụ thể (Sessions)
      const sessions = data.rows.map(row => {
        const date = dayjs( hockyData.ngay_monday_tuan_1).add(parseInt(row[col.tuan]) - 1, 'week').add(parseInt(row[col.thu]) - 2, 'day').format('YYYY-MM-DD');
        const fullThay = isGVThaySplitAcrossTwoCols
          ? `${cleanStr(row[col.gvThay])} ${cleanStr(row[col.gvThay + 1])}`.trim()
          : cleanStr(row[col.gvThay]);
        return {
          lophocphan_id: lhp.lophocphan_id,
          ngay: date,
          trangthai: 'scheduled',
          tiet_bat_dau: parseInt(row[col.tietBD]),
          so_tiet: parseInt(row[col.soTiet]) || data.so_tiet,
          phong: cleanStr(row[col.phong]), // Lưu phòng của buổi học này
          giangvien_day_thay_id: fullThay.length > 2 ? mapGiangVien.get(`NAME_${fullThay.toUpperCase()}`) : null
        };
      });
      // Bulk upsert buổi học
      await BuoiHoc.bulkCreate(sessions, { updateOnDuplicate: ['giangvien_day_thay_id', 'tiet_bat_dau', 'so_tiet', 'phong'], transaction: t });
    }

    await t.commit();
    return { success: true, countLHP: groups.size };
  } catch (error) {
    await t.rollback();
    console.error("IMPORT ERROR LOG:", error);
    throw error;
  }
};




const getAllLichTheoNgayHomNay = async (targetDate) => {
    try {
        const data = await db.BuoiHoc.findAll({
            where: { ngay: targetDate },
            attributes: ['buoi_id', 'ngay', 'trangthai', 'ghi_chu', 'phong', 'tiet_bat_dau', 'so_tiet'],
            include: [
                {
                    model: db.LopHocPhan,
                    as: 'LopHocPhan',
                    required: true,
                    attributes: ['lophocphan_id', 'ten_lophocphan', 'phong', 'thu', 'tiet_bat_dau', 'so_tiet', 'loai_hoc_phan'],
                    include: [
                        { model: db.MonHoc, attributes: ['ten_mon', 'ma_mon'] },
                        { model: db.GiangVien, attributes: ['ho', 'ten', 'ma_gv'] },
                        {
                            model: db.LopHanhChinh,
                            as: 'DanhSachLopHanhChinh',
                            attributes: ['ten_lop'],
                            through: { attributes: [] }
                        }
                    ]
                },
                {
                    model: db.GiangVien,
                    as: 'GVDayThay',
                    attributes: ['ho', 'ten', 'ma_gv']
                }
            ],
            // Sắp xếp theo tiết bắt đầu (ưu tiên tiết thực tế của buổi học)
            order: [
                [db.sequelize.literal('COALESCE(BuoiHoc.tiet_bat_dau, LopHocPhan.tiet_bat_dau)'), 'ASC']
            ]
        });

        // Flatten dữ liệu chuyên nghiệp
        return data.map(buoi => {
            const lhp = buoi.LopHocPhan;
            const tietBD = buoi.tiet_bat_dau || lhp.tiet_bat_dau;
            const soTiet = buoi.so_tiet || lhp.so_tiet;
            
            return {
                buoi_id: buoi.buoi_id,
                ngay: buoi.ngay,
                tiet_bat_dau: tietBD,
                so_tiet: soTiet,
                tiet_ket_thuc: tietBD + soTiet - 1,
                phong: buoi.phong || lhp.phong || 'Chưa xếp',
                is_doi_phong: !!(buoi.phong && buoi.phong !== lhp.phong),
                
                ten_mon: lhp.MonHoc?.ten_mon || lhp.ten_lophocphan,
                ma_mon: lhp.MonHoc?.ma_mon || '',
                loai_hinh: lhp.loai_hoc_phan,
                
                // Xử lý lớp ghép (Joint Classes)
                cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh?.map(l => l.ten_lop).join(', ') || '',
                
                // Giảng viên (Ưu tiên hiện GV dạy thay nếu có)
                giang_vien_chinh: `${lhp.GiangVien?.ho} ${lhp.GiangVien?.ten}`,
                giang_vien_thuc_te: buoi.GVDayThay 
                    ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten} (Dạy thay)` 
                    : `${lhp.GiangVien?.ho} ${lhp.GiangVien?.ten}`,
                
                trangthai: buoi.trangthai,
                ghi_chu: buoi.ghi_chu
            };
        });
    } catch (error) {
        console.error("Error in getAllLichTheoNgay:", error);
        throw error;
    }
};



module.exports = {
  getLichGiangDay,
  getLichTheoNgay,
  getLichTuanNay,
  getAllByHocKy,
  getLichChiTiet,
  importScheduleExcel,
  getAllLichTheoNgayHomNay

};



