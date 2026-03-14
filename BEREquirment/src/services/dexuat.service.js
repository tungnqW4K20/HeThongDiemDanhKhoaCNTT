'use strict';
const db = require('../models');
const { DeXuatChinhSua, BuoiHoc, LopHocPhan, GiangVien, MonHoc, LopHanhChinh,TaiKhoan, sequelize } = db;
const { Op } = require('sequelize');

/**
 * Kiểm tra xung đột lịch thực tế (Conflict Detection)
 */
const checkConflict = async ({ ngay, tietBD, soTiet, phong, giangvien_id, ignore_buoi_id }) => {
    const tietKT = tietBD + soTiet - 1;
    const sessions = await BuoiHoc.findAll({
        where: { 
            ngay, 
            trangthai: { [Op.ne]: 'cancelled' },
            ...(ignore_buoi_id && { buoi_id: { [Op.ne]: ignore_buoi_id } })
        },
        include: [{ model: LopHocPhan, as: 'LopHocPhan', attributes: ['giangvien_id'] }]
    });

    for (const s of sessions) {
        const s_start = s.tiet_bat_dau;
        const s_end = s.tiet_bat_dau + s.so_tiet - 1;
        const s_gv = s.giangvien_day_thay_id || s.LopHocPhan.giangvien_id;

        if (tietBD <= s_end && s_start <= tietKT) {
            if (phong && s.phong === phong) return { conflict: true, message: `Phòng ${phong} đã bận (tiết ${s_start}-${s_end})` };
            if (giangvien_id && s_gv === giangvien_id) return { conflict: true, message: `Giảng viên bận dạy lớp khác (tiết ${s_start}-${s_end})` };
        }
    }
    return { conflict: false };
};

// --- GIẢNG VIÊN GỬI ĐỀ XUẤT ---
const guiDeXuat = async (buoi_id, data, user_gv_id) => {
    const buoi = await BuoiHoc.findByPk(buoi_id, { include: [{ model: LopHocPhan, as: 'LopHocPhan' }] });
    if (!buoi) throw new Error("Buổi học không tồn tại.");
    if (buoi.LopHocPhan.giangvien_id !== user_gv_id) throw new Error("Bạn chỉ được phép đề xuất cho buổi dạy của mình.");

    const check = await checkConflict({
        ngay: data.ngay_moi || buoi.ngay,
        tietBD: data.tiet_bat_dau_moi || buoi.tiet_bat_dau,
        soTiet: data.so_tiet_moi || buoi.so_tiet,
        phong: data.phong_moi || buoi.phong,
        giangvien_id: data.giangvien_day_thay_moi_id || buoi.giangvien_day_thay_id || user_gv_id,
        ignore_buoi_id: buoi_id
    });
    if (check.conflict) { const err = new Error(check.message); err.statusCode = 409; throw err; }

    return await DeXuatChinhSua.create({
        buoi_id, 
        nguoi_de_xuat_id: user_gv_id,
        loai_de_xuat: data.loai_de_xuat || 'chinh_sua',
        ngay_moi: data.ngay_moi, 
        tiet_bat_dau_moi: data.tiet_bat_dau_moi,
        so_tiet_moi: data.so_tiet_moi, 
        phong_moi: data.phong_moi,
        giangvien_day_thay_moi_id: data.giangvien_day_thay_moi_id,
        ly_do: data.ly_do
    });
};

// --- ADMIN LẤY DANH SÁCH (LOGIC MẠNH - KHÔNG SỬA MODEL) ---
const getDachSachDeXuat = async (status = 'pending') => {
    const list = await DeXuatChinhSua.findAll({
        where: { trang_thai: status },
        include: [
            { 
                model: BuoiHoc, as: 'BuoiHoc',
                attributes: ['buoi_id', 'ngay', 'tiet_bat_dau', 'so_tiet', 'phong', 'giangvien_day_thay_id'],
                include: [{ 
                    model: LopHocPhan, as: 'LopHocPhan',
                    include: [
                        { model: MonHoc, attributes: ['ten_mon'] },
                        { model: LopHanhChinh, as: 'DanhSachLopHanhChinh', attributes: ['ten_lop'], through: { attributes: [] } }
                    ]
                }] 
            },
            { model: GiangVien, as: 'NguoiDeXuat', attributes: ['ho', 'ten', 'ma_gv'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    // Vì không sửa Model để thêm GVDayThayMoi, ta sẽ bốc tên giảng viên thủ công ở đây
    const listFinal = await Promise.all(list.map(async (item) => {
        let gvThayMoi = null;
        if (item.giangvien_day_thay_moi_id) {
            gvThayMoi = await GiangVien.findByPk(item.giangvien_day_thay_moi_id, { attributes: ['ho', 'ten'] });
        }
        const data = item.get({ plain: true });
        data.GVDayThayMoi = gvThayMoi; // Gắn thêm thông tin cho Frontend
        return data;
    }));

    return listFinal;
};

// --- ADMIN PHÊ DUYỆT ---
const xuLyPheDuyet = async (dexuat_id, status, admin_id, phan_hoi) => {
    const t = await sequelize.transaction();
    try {
        const dx = await DeXuatChinhSua.findByPk(dexuat_id, { include: [{ model: BuoiHoc, as: 'BuoiHoc' }] });
        if (!dx || dx.trang_thai !== 'pending') throw new Error("Đề xuất không hợp lệ.");

        if (status === 'approved') {
            const buoi = dx.BuoiHoc;

            if (dx.loai_de_xuat === 'mo_lai') {
                // Mở lại buổi học: đặt lại trạng thái và xóa dữ liệu điểm danh cũ
                await BuoiHoc.update(
                    { trangthai: 'scheduled', ghi_chu: `Admin mở lại: ${dx.ly_do}`, is_override: true },
                    { where: { buoi_id: dx.buoi_id }, transaction: t }
                );
            } else {
                // Chỉnh sửa thông tin buổi học
                const updateData = {
                    ngay: dx.ngay_moi || buoi.ngay,
                    phong: dx.phong_moi || buoi.phong,
                    tiet_bat_dau: dx.tiet_bat_dau_moi || buoi.tiet_bat_dau,
                    so_tiet: dx.so_tiet_moi || buoi.so_tiet,
                    giangvien_day_thay_id: dx.giangvien_day_thay_moi_id || buoi.giangvien_day_thay_id,
                    ghi_chu: `Admin duyệt: ${dx.ly_do}`
                };
                await BuoiHoc.update(updateData, { where: { buoi_id: dx.buoi_id }, transaction: t });
            }
        }

        await dx.update({ trang_thai: status, nguoi_duyet_id: admin_id, phan_hoi_admin: phan_hoi }, { transaction: t });
        await t.commit();
        return { success: true };
    } catch (error) { await t.rollback(); throw error; }
};



const getDanhSachDeXuatCuaGiangVien = async (giangvien_id) => {
  const list = await DeXuatChinhSua.findAll({
    where: { nguoi_de_xuat_id: giangvien_id },
    include: [
      {
        model: BuoiHoc, as: 'BuoiHoc',
        include: [{
          model: LopHocPhan, as: 'LopHocPhan',
          include: [
            { model: MonHoc, attributes: ['ma_mon', 'ten_mon'] },
            { 
              model: LopHanhChinh, as: 'DanhSachLopHanhChinh', 
              attributes: ['ten_lop'], through: { attributes: [] } 
            }
          ]
        }]
      },
      // Lấy thông tin Giảng viên dạy thay mới bằng cách join bảng GiangVien
      // Lưu ý: Nếu Model chưa định nghĩa alias 'GVThayMoi', bạn có thể dùng findByPk bên dưới
    ],
    order: [['createdAt', 'DESC']]
  });

  const result = await Promise.all(list.map(async (item) => {
    const data = item.get({ plain: true });

    // --- LẤY TÊN GIẢNG VIÊN DẠY THAY CHI TIẾT Ở ĐÂY ---
    if (data.giangvien_day_thay_moi_id) {
      const gv = await db.GiangVien.findByPk(data.giangvien_day_thay_moi_id, {
        attributes: ['ho', 'ten', 'ma_gv']
      });
      if (gv) {
        data.ten_gv_day_thay_moi = `${gv.ho} ${gv.ten}`; // Nối Họ + Tên
        data.ma_gv_day_thay_moi = gv.ma_gv;
      } else {
        data.ten_gv_day_thay_moi = "Không xác định";
      }
    } else {
      data.ten_gv_day_thay_moi = "Không có (Tự dạy)";
    }

    // Nối tên môn và lớp cho gọn
    data.ten_mon = data.BuoiHoc?.LopHocPhan?.MonHoc?.ten_mon || "";
    data.ma_mon = data.BuoiHoc?.LopHocPhan?.MonHoc?.ma_mon || "";
    data.ten_lop = data.BuoiHoc?.LopHocPhan?.DanhSachLopHanhChinh?.map(l => l.ten_lop).join(", ") || "";

    return data;
  }));

  return result;
};



module.exports = { guiDeXuat, getDachSachDeXuat, xuLyPheDuyet, getDanhSachDeXuatCuaGiangVien };