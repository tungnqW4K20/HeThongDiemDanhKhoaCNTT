'use strict';
const phanCongService = require('../services/phancong.service');
const dayjs = require("dayjs");
const xlsx = require('xlsx');
const db = require('../models');


const resolveScopeForSchedule = async (user = {}) => {
  const { role, khoa_id, chuyennganh_id, id } = user;

  if (role !== 'truongbomon') {
    return {
      target_khoa_id: role === 'lanhdao' ? (khoa_id || null) : null,
      target_chuyennganh_id: null
    };
  }

  const boMon = await db.BoMon.findOne({
    where: {
      truong_bomon_id: id || null,
      isDeleted: false
    },
    attributes: ['bomon_id', 'khoa_id']
  });

  return {
    target_khoa_id: boMon?.khoa_id || khoa_id || null,
    target_chuyennganh_id: boMon?.bomon_id || chuyennganh_id || null
  };
};


const getLichGiangDay = async (req, res) => {
  try {
    const giangvien_id = req.user.giangvien_id;
    const { hocky_id } = req.query;

    if (!hocky_id) return res.status(400).json({ success: false, message: "Thiếu hocky_id" });
    const hocKy = await db.HocKy.findByPk(hocky_id, {
      attributes: ['hocky_id', 'ten_hocky', 'ngay_batdau', 'ngay_ketthuc', 'ngay_monday_tuan_1', 'tuan_bat_dau_co_lich']
    });

    if (!hocKy) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy học kỳ'
      });
    }
    const data = await phanCongService.getLichGiangDay(giangvien_id, hocky_id);

    return res.status(200).json({
      success: true,
      count: data.length, // Ở đây count sẽ là TỔNG SỐ BUỔI DẠY trong kỳ (ví dụ 45 buổi)
      data,
      hocKy: {
        hocky_id: hocKy.hocky_id,
        ten_hocky: hocKy.ten_hocky,
        ngay_batdau: hocKy.ngay_batdau,
        ngay_ketthuc: hocKy.ngay_ketthuc,
        ngay_monday_tuan_1: hocKy.ngay_monday_tuan_1,
        tuan_bat_dau_co_lich: hocKy.tuan_bat_dau_co_lich || 1
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getLichHomNay = async (req, res) => {
  try {
    const giangvien_id = req.user.giangvien_id;

    if (!giangvien_id) {
      return res.status(403).json({
        success: false,
        message: "Thông tin giảng viên không hợp lệ."
      });
    }

    // Lấy chính xác chuỗi ngày hôm nay và ngày mai
    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");

    const data = await phanCongService.getLichTheoNgay(giangvien_id, [today, tomorrow]);

    return res.status(200).json({
      success: true,
      message: `Lấy lịch dạy ngày ${today} và ${tomorrow} thành công.`,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch dạy.",
      error: error.message
    });
  }
};


// const getAllAssignments = async (req, res) => {
//   try {
//     const { hocky_id, keyword } = req.query;

//     if (!hocky_id) {
//       return res.status(400).json({ success: false, message: "Vui lòng cung cấp hocky_id" });
//     }


//     const rows = await phanCongService.getAllByHocKy(hocky_id, keyword || '');

//     // Làm phẳng dữ liệu với kiểm tra an toàn
//     const formattedData = rows.map(buoi => {
//       // Dùng Optional Chaining để tránh lỗi "undefined"
//       const lhp = buoi.LopHocPhan;

//       // Nếu lhp bị undefined vì lý do nào đó, trả về object rỗng tránh crash
//       if (!lhp) return null;

//       const tietBD = lhp.tiet_bat_dau || 0;
//       const soTiet = lhp.so_tiet || 0;
//       const tietKT = soTiet > 0 ? (tietBD + soTiet - 1) : tietBD;

//       return {
//         buoi_id: buoi.buoi_id,
//         ngay: buoi.ngay,
//         thu: lhp.thu,
//         tiet_bat_dau: tietBD,
//         tiet_ket_thuc: tietKT,
//         so_tiet: soTiet,
//         tiet_hien_thi: `${tietBD} - ${tietKT} (${soTiet} tiết)`,

//         // Ưu tiên phòng thay đổi
//         phong: buoi.phong_thay_doi || lhp.phong || 'Chưa xếp phòng',
//         is_doi_phong: !!buoi.phong_thay_doi,

//         ten_mon: lhp.MonHoc?.ten_mon || lhp.ten_lophocphan || 'Không rõ môn',
//         ma_mon: lhp.MonHoc?.ma_mon || '',
//         hinh_thuc: lhp.loai_hoc_phan || 'LT',

//         // Ghép lớp hành chính
//         cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh?.map(lhc => lhc.ten_lop).join(', ') || 'Chưa có lớp',

//         // Giảng viên chính và dạy thay
//         ten_giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'Chưa rõ',
//         giang_vien_day_thay: buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null,

//         trang_thai: buoi.trangthai, // scheduled, completed, cancelled
//         ghi_chu: buoi.ghi_chu
//       };
//     }).filter(item => item !== null); // Loại bỏ những dòng lỗi lhp bị null

//     return res.status(200).json({
//       success: true,
//       message: "Lấy lịch trình học kỳ thành công.",
//       count: formattedData.length,
//       data: formattedData,

//     });

//   } catch (error) {
//     console.error("Error in getAllTimeline Controller:", error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Lỗi xử lý dữ liệu: " + error.message 
//     });
//   }
// };
const getAllAssignments = async (req, res) => {
  try {
    const { hocky_id, keyword, from_date, to_date } = req.query;
    console.log(">>> [BACKEND GET ALL ASSIGNMENTS] query params:", req.query);

    const { target_khoa_id, target_chuyennganh_id } = await resolveScopeForSchedule(req.user || {});

    if (!hocky_id) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp hocky_id" });
    }

    const rows = await phanCongService.getAllByHocKy(
      hocky_id,
      keyword || '',
      target_khoa_id,
      target_chuyennganh_id,
      from_date || null,
      to_date || null
    );

    // Làm phẳng dữ liệu với kiểm tra an toàn
    const formattedData = rows.map(buoi => {
      const lhp = buoi.LopHocPhan;

      if (!lhp) return null;

      const tietBD = buoi.tiet_bat_dau || lhp.tiet_bat_dau || 0;
      const soTiet = buoi.so_tiet || lhp.so_tiet || 0;
      const tietKT = soTiet > 0 ? (tietBD + soTiet - 1) : tietBD;

      return {
        buoi_id: buoi.buoi_id,
        ngay: buoi.ngay,
        thu: lhp.thu,
        tiet_bat_dau: tietBD,
        tiet_ket_thuc: tietKT,
        so_tiet: soTiet,
        tiet_hien_thi: `${tietBD} - ${tietKT} (${soTiet} tiết)`,

        phong: buoi.phong || lhp.phong || 'Chưa xếp phòng',
        is_doi_phong: !!(buoi.phong && buoi.phong !== lhp.phong),

        ten_mon: lhp.MonHoc?.ten_mon || lhp.ten_lophocphan || 'Không rõ môn',
        ma_mon: lhp.MonHoc?.ma_mon || '',
        bo_mon_id: lhp.MonHoc?.bomon_id || lhp.MonHoc?.chuyennganh_id || null,
        chuyennganh_id: lhp.MonHoc?.chuyennganh_id || lhp.MonHoc?.bomon_id || null,
        hinh_thuc: lhp.loai_hoc_phan || 'LT',

        cac_lop_hanh_chinh: lhp.DanhSachLopHanhChinh?.map(lhc => lhc.ten_lop).join(', ') || 'Chưa có lớp',

        ten_giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'Chưa rõ',
        giang_vien_day_thay: buoi.GVDayThay ? `${buoi.GVDayThay.ho} ${buoi.GVDayThay.ten}` : null,

        trang_thai: buoi.trangthai,
        ghi_chu: buoi.ghi_chu,

        lophocphan_id: lhp.lophocphan_id,
        hocky_id: lhp.hocky_id,
        monhoc_id: lhp.monhoc_id,
        giangvien_id: lhp.giangvien_id,
        lop_hanhchinh_ids: lhp.DanhSachLopHanhChinh?.map(lhc => lhc.lop_hanhchinh_id) || [],

        // Chỉ số điểm danh được nạp từ SQL subquery
        da_diem_danh: parseInt(buoi.getDataValue('da_diem_danh')) || 0,
        si_so_hien_dien: parseInt(buoi.getDataValue('si_so_hien_dien')) || 0,
        si_so: parseInt(buoi.getDataValue('si_so')) || 0
      };
    }).filter(item => item !== null);

    // Tính toán chỉ số thống kê điểm danh ở phía Backend (số lượng lớp hoàn thành / chưa hoàn thành)
    let completed = 0;
    let pending = 0;

    formattedData.forEach(item => {
      const status = item.trang_thai || 'pending';
      if (status === 'completed') completed++;
      else pending++;
    });

    // Tính toán danh sách sinh viên vắng > 20% trên toàn bộ các lớp của HỌC KỲ này (theo Scope)
    const lhpScopeWhere = { hocky_id };
    if (target_khoa_id) {
      if (target_chuyennganh_id) {
        lhpScopeWhere[db.Sequelize.Op.or] = [
          { '$MonHoc.bomon_id$': target_chuyennganh_id },
          { '$MonHoc.chuyennganh_id$': target_chuyennganh_id }
        ];
      } else {
        lhpScopeWhere[db.Sequelize.Op.or] = [
          { '$MonHoc.khoa_id$': target_khoa_id },
          { '$MonHoc.BoMon.khoa_id$': target_khoa_id },
          { '$DanhSachLopHanhChinh.khoa_id$': target_khoa_id }
        ];
      }
    }

    const lhpRows = await db.LopHocPhan.findAll({
      where: lhpScopeWhere,
      attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'phong', 'tuan_hoc'],
      include: [
        {
          model: db.MonHoc,
          required: false,
          attributes: ['monhoc_id', 'ten_mon', 'ma_mon', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
          include: [{ model: db.BoMon, as: 'BoMon', attributes: ['khoa_id'] }]
        },
        {
          model: db.GiangVien,
          attributes: ['giangvien_id', 'ho', 'ten', 'ma_gv'],
          required: false
        },
        {
          model: db.LopHanhChinh,
          as: 'DanhSachLopHanhChinh',
          attributes: ['lop_hanhchinh_id', 'khoa_id'],
          through: { attributes: [] },
          required: false
        },
        {
          model: db.BuoiHoc,
          as: 'DanhSachBuoiHoc',
          attributes: ['phong'],
          required: false
        }
      ]
    });

    const classIds = [...new Set(lhpRows.map(x => x.lophocphan_id).filter(Boolean))];
    const warningsStudents = [];

    if (classIds.length > 0) {
      const dangKyHocRows = await db.DangKyHoc.findAll({
        where: {
          lophocphan_id: { [db.Sequelize.Op.in]: classIds },
          trangthai: 'active'
        },
        attributes: ['lophocphan_id', 'sinhvien_id'],
        include: [{ model: db.SinhVien, attributes: ['ma_sv', 'ten'] }]
      });

      const completedBuoiHoc = await db.BuoiHoc.findAll({
        where: {
          lophocphan_id: { [db.Sequelize.Op.in]: classIds },
          trangthai: 'completed'
        },
        attributes: ['buoi_id', 'lophocphan_id']
      });

      const completedBuoiIds = completedBuoiHoc.map((b) => b.buoi_id);
      const completedAttendances = completedBuoiIds.length > 0
        ? await db.DiemDanh.findAll({
            where: { buoi_id: { [db.Sequelize.Op.in]: completedBuoiIds } },
            attributes: ['buoi_id', 'sinhvien_id', 'trangthai']
          })
        : [];

      const regsByClass = new Map();
      dangKyHocRows.forEach((r) => {
        if (!regsByClass.has(r.lophocphan_id)) regsByClass.set(r.lophocphan_id, []);
        regsByClass.get(r.lophocphan_id).push(r);
      });

      const completedByClass = new Map();
      completedBuoiHoc.forEach((r) => {
        if (!completedByClass.has(r.lophocphan_id)) completedByClass.set(r.lophocphan_id, []);
        completedByClass.get(r.lophocphan_id).push(r.buoi_id);
      });

      const attendanceByBuoi = new Map();
      completedAttendances.forEach((r) => {
        if (!attendanceByBuoi.has(r.buoi_id)) attendanceByBuoi.set(r.buoi_id, []);
        attendanceByBuoi.get(r.buoi_id).push(r);
      });

      const lhpMap = new Map(lhpRows.map(x => [x.lophocphan_id, x]));
      const lhpDetails = new Map();
      formattedData.forEach((item) => {
        if (item && !lhpDetails.has(item.lophocphan_id)) {
          lhpDetails.set(item.lophocphan_id, item);
        }
      });

      classIds.forEach((classId) => {
        const regs = regsByClass.get(classId) || [];
        const completedIds = completedByClass.get(classId) || [];
        if (regs.length === 0 || completedIds.length === 0) return;

        const lhpObj = lhpMap.get(classId);
        const details = lhpDetails.get(classId);

        let tongBuoiKeHoach = completedIds.length;
        if (lhpObj?.tuan_hoc) {
          try {
            const tuanHocValue = Array.isArray(lhpObj.tuan_hoc)
              ? lhpObj.tuan_hoc
              : JSON.parse(lhpObj.tuan_hoc);
            if (Array.isArray(tuanHocValue) && tuanHocValue.length > 0) {
              tongBuoiKeHoach = tuanHocValue.length;
            }
          } catch (error) {
            tongBuoiKeHoach = completedIds.length;
          }
        }

        regs.forEach((reg) => {
          let absences = 0;
          completedIds.forEach((buoiId) => {
            const found = (attendanceByBuoi.get(buoiId) || []).find((a) => a.sinhvien_id === reg.sinhvien_id);
            if (found?.trangthai === 'absent') absences += 1;
          });

          const rate = tongBuoiKeHoach > 0 ? (absences / tongBuoiKeHoach) * 100 : 0;
          if (rate >= 20) {
            const rooms = lhpObj?.DanhSachBuoiHoc ? [...new Set(lhpObj.DanhSachBuoiHoc.map(b => b.phong).filter(Boolean))] : [];
            const classRoom = rooms.length > 0 ? rooms.join(', ') : (lhpObj?.phong || 'N/A');

            warningsStudents.push({
              lophocphan_id: classId,
              ten_lop: lhpObj?.MonHoc?.ten_mon || lhpObj?.ten_lophocphan || 'N/A',
              ma_lop: lhpObj?.ma_lop || lhpObj?.MonHoc?.ma_mon || String(classId),
              giang_vien: lhpObj?.GiangVien ? `${lhpObj.GiangVien.ho} ${lhpObj.GiangVien.ten}` : 'N/A',
              sinhvien_id: reg.sinhvien_id,
              ma_sv: reg.SinhVien?.ma_sv || 'N/A',
              ten_sv: reg.SinhVien?.ten || 'N/A',
              ti_le_vang: Number(rate.toFixed(2)),
              so_buoi_vang: absences,
              tong_so_buoi: tongBuoiKeHoach,
              phong: classRoom
            });
          }
        });
      });
    }

    const shouldGetWarningsList = req.query.get_warnings === 'true';

    return res.status(200).json({
      success: true,
      message: "Lấy lịch trình học kỳ thành công.",
      count: formattedData.length,
      stats: {
        total: formattedData.length,
        completed,
        pending,
        warning: warningsStudents.length
      },
      ...(shouldGetWarningsList ? { warnings_students: warningsStudents } : {}),
      data: formattedData
    });

  } catch (error) {
    console.error("Error in getAllTimeline Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xử lý dữ liệu: " + error.message
    });
  }
};



const getLichChiTietHocKy = async (req, res) => {
  try {
    const { target_khoa_id, target_chuyennganh_id } = await resolveScopeForSchedule(req.user || {});

    const {
      hocky_id,
      page,
      limit,
      from_date, // YYYY-MM-DD
      to_date,   // YYYY-MM-DD
      giangvien_id
    } = req.query;

    if (!hocky_id && (!from_date || !to_date)) {
      return res.status(400).json({
        success: false,
        message: "Phải cung cấp hocky_id HOẶC khoảng thời gian (from_date, to_date)"
      });
    }

    const result = await phanCongService.getLichChiTiet({
      hocky_id,
      page,
      limit,
      fromDate: from_date,
      toDate: to_date,
      giangvien_id,
      target_khoa_id,
      target_chuyennganh_id
    });

    // Flatten dữ liệu cho nhẹ
    const flatData = result.data.map(buoi => {
      const lhp = buoi.LopHocPhan;
      if (!lhp) return null; // Dữ liệu rác

      const lhcs = lhp.DanhSachLopHanhChinh || [];
      const tenLopHc = lhcs.map(l => l.ten_lop).join(', ');

      return {
        buoi_id: buoi.buoi_id,
        ngay: buoi.ngay,
        thu: lhp.thu,
        trangthai: buoi.trangthai,

        // Thông tin hiển thị (Chỉ lấy cái cần thiết)
        ten_lop_hp: lhp.ten_lophocphan,
        ten_mon: lhp.MonHoc?.ten_mon,
        ma_mon: lhp.MonHoc?.ma_mon,
        lop_hc: tenLopHc,

        giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'Chưa xếp',

        phong: lhp.phong,
        // Logic hiển thị giờ:
        ca_hoc: `${buoi.batdau ? new Date(buoi.batdau).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : lhp.gio_batdau} - ${buoi.ketthuc ? new Date(buoi.ketthuc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : lhp.gio_ketthuc}`
      };
    }).filter(i => i !== null);

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu thành công",
      pagination: {
        total: result.totalItems,
        totalPages: result.totalPages,
        current: result.currentPage,
        limit: parseInt(limit || 20)
      },
      data: flatData
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const importSchedule = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Vui lòng đính kèm file Excel" });
    console.log("req.body", req.body)
    const { ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1, hocky_id, bomon_id } = req.body;
    const { role, khoa_id, chuyennganh_id } = req.user || {};
    const resolvedScope = await resolveScopeForSchedule(req.user || {});
    if (!ten_hocky || !ngay_batdau) {
      return res.status(400).json({ success: false, message: "Tên học kỳ và Ngày bắt đầu là bắt buộc" });
    }

    let targetBoMonId = bomon_id || null;
    if (role === 'truongbomon') {
      if (!resolvedScope.target_chuyennganh_id) {
        return res.status(403).json({ success: false, message: 'Tài khoản trưởng bộ môn chưa được gán bộ môn quản lý.' });
      }
      targetBoMonId = resolvedScope.target_chuyennganh_id;
    } else if (!targetBoMonId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bộ môn để import lịch dạy.' });
    }

    if (targetBoMonId) {
      const whereBoMon = { bomon_id: targetBoMonId, isDeleted: false };
      if ((role === 'lanhdao' || role === 'truongbomon') && (resolvedScope.target_khoa_id || khoa_id)) {
        whereBoMon.khoa_id = resolvedScope.target_khoa_id || khoa_id;
      }

      const boMon = await db.BoMon.findOne({ where: whereBoMon, attributes: ['bomon_id'] });
      if (!boMon) {
        return res.status(400).json({ success: false, message: 'Bộ môn đã chọn không hợp lệ hoặc ngoài phạm vi quản lý.' });
      }
    }

    const result = await phanCongService.importScheduleExcel(req.file.buffer, {
      ten_hocky,
      ngay_batdau,
      ngay_ketthuc,
      ngay_monday_tuan_1,
      hocky_id,
      selected_bomon_id: targetBoMonId
    });

    return res.status(200).json({
      success: true,
      message: `Import thành công ${result.countLHP} lớp học phần.`,
      detail: "Số tiết và SDT giảng viên đã được đồng bộ chính xác.",
      importResult: result.rowResults || null
    });
  } catch (error) {
    console.error("IMPORT SCHEDULE ERROR:", error);
    let msg = error.message;
    if (error.errors && Array.isArray(error.errors)) {
      msg = "Lỗi dữ liệu: " + error.errors.map(e => `${e.path} (${e.value}): ${e.message}`).join('; ');
    }
    return res.status(500).json({ 
      success: false, 
      message: msg,
      errorName: error.name,
      details: error.errors || null
    });
  }
};



const getAllLichHomNayAdmin = async (req, res) => {
  try {
    // Lấy ngày hôm nay theo format YYYY-MM-DD
    const today = dayjs().format("YYYY-MM-DD");

    const data = await phanCongService.getAllLichTheoNgayHomNay(today);

    return res.status(200).json({
      success: true,
      message: `Lấy toàn bộ lịch dạy ngày hôm nay (${today}) thành công.`,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error("ADMIN GET TODAY SCHEDULE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi truy xuất lịch toàn trường.",
      error: error.message
    });
  }
};




module.exports = {
  getLichGiangDay,
  getLichHomNay,
  // getLichTuan,
  getAllAssignments,
  getLichChiTietHocKy,
  importSchedule,
  getAllLichHomNayAdmin
};

