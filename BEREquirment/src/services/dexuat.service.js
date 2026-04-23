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
    include: [{
      model: LopHocPhan,
      as: 'LopHocPhan',
      attributes: ['giangvien_id'],
      include: [
        { model: GiangVien, attributes: ['ma_gv', 'ho', 'ten', 'email', 'sdt'] },
        { model: MonHoc, attributes: ['ma_mon', 'ten_mon'] },
        {
          model: LopHanhChinh,
          as: 'DanhSachLopHanhChinh',
          attributes: ['ten_lop'],
          through: { attributes: [] }
        }
      ]
    }]
    });

    for (const s of sessions) {
        const s_start = s.tiet_bat_dau;
        const s_end = s.tiet_bat_dau + s.so_tiet - 1;
        const s_gv = s.giangvien_day_thay_id || s.LopHocPhan.giangvien_id;
      const sameLecturer = giangvien_id && s_gv === giangvien_id;
      const isOverlappingTiet = tietBD <= s_end && s_start <= tietKT;

      const lopHocPhan = s.LopHocPhan;
      const monHoc = lopHocPhan?.MonHoc;
      const gv = lopHocPhan?.GiangVien;
      const tenLop = (lopHocPhan?.DanhSachLopHanhChinh || []).map(l => l.ten_lop).join(', ');

      // Rule nghiệp vụ: Giảng viên bị trùng CA/TIẾT thì chặn đề xuất.
      if (sameLecturer && isOverlappingTiet) {
        const tenMonDayDu = monHoc?.ten_mon || 'môn chưa xác định';
        const lopDayDu = tenLop || 'lớp chưa xác định';
        return {
          conflict: true,
          message: `Không thể tạo đề xuất: giảng viên đã có lịch dạy ${tenMonDayDu} (${lopDayDu}) vào tiết ${s_start}-${s_end} ngày ${ngay}.`,
          detail: {
            type: 'lecturer_period',
            buoi_id: s.buoi_id,
            ngay,
            tiet_trung: `${s_start}-${s_end}`,
            phong: s.phong || null,
            ten_mon: monHoc?.ten_mon || 'N/A',
            ma_mon: monHoc?.ma_mon || 'N/A',
            ten_lop: tenLop || 'N/A',
            giang_vien: gv ? `${gv.ho} ${gv.ten}` : 'N/A',
            ma_gv: gv?.ma_gv || 'N/A',
            email: gv?.email || null,
            sdt: gv?.sdt || null
          }
        };
      }

      if (isOverlappingTiet) {
          if (phong && s.phong === phong) {
            const tenMonDayDu = monHoc?.ten_mon || 'môn chưa xác định';
            const lopDayDu = tenLop || 'lớp chưa xác định';
            return {
              conflict: true,
              message: `Không thể tạo đề xuất: phòng ${phong} đã bận vào tiết ${s_start}-${s_end} cho ${tenMonDayDu} (${lopDayDu}). Vui lòng chọn phòng hoặc thời gian khác.`,
              detail: {
                type: 'room',
                buoi_id: s.buoi_id,
                ngay,
                tiet_trung: `${s_start}-${s_end}`,
                phong: s.phong,
                ten_mon: monHoc?.ten_mon || 'N/A',
                ma_mon: monHoc?.ma_mon || 'N/A',
                ten_lop: tenLop || 'N/A',
                giang_vien: gv ? `${gv.ho} ${gv.ten}` : 'N/A',
                ma_gv: gv?.ma_gv || 'N/A',
                email: gv?.email || null,
                sdt: gv?.sdt || null
              }
            };
          }
        }
    }
    return { conflict: false };
};

const resolveEffectiveLecturerId = ({ proposalSubstituteId, currentSubstituteId, mainLecturerId }) => {
  const normalizedProposalSubstituteId =
    proposalSubstituteId && proposalSubstituteId === mainLecturerId
      ? null
      : (proposalSubstituteId || null);

  return normalizedProposalSubstituteId || currentSubstituteId || mainLecturerId || null;
};

// --- GIẢNG VIÊN GỬI ĐỀ XUẤT ---
const guiDeXuat = async (buoi_id, data, user_gv_id) => {
    const buoi = await BuoiHoc.findByPk(buoi_id, {
      include: [{
        model: LopHocPhan,
        as: 'LopHocPhan',
        include: [
          { model: MonHoc, attributes: ['ma_mon', 'ten_mon'] },
          {
            model: LopHanhChinh,
            as: 'DanhSachLopHanhChinh',
            attributes: ['ten_lop'],
            through: { attributes: [] }
          }
        ]
      }]
    });
    if (!buoi) throw new Error("Buổi học không tồn tại.");
    if (buoi.LopHocPhan.giangvien_id !== user_gv_id) throw new Error("Bạn chỉ được phép đề xuất cho buổi dạy của mình.");

  const loaiDeXuat = data.loai_de_xuat || 'chinh_sua';

  // Chặn gửi đề xuất chỉnh sửa nếu không có thay đổi thực tế.
  if (loaiDeXuat === 'chinh_sua') {
    const giangVienChinhId = buoi.LopHocPhan.giangvien_id;
    const currentNgay = String(buoi.ngay || '');
    const currentTietBatDau = Number(buoi.tiet_bat_dau || 0);
    const currentSoTiet = Number(buoi.so_tiet || 0);
    const currentPhong = String(buoi.phong || '');
    const currentGVDayThay = buoi.giangvien_day_thay_id || null;

    const requestedGVDayThay = data.giangvien_day_thay_moi_id || null;
    const normalizedRequestedGVDayThay = requestedGVDayThay === giangVienChinhId ? null : requestedGVDayThay;

    const nextNgay = String(data.ngay_moi || buoi.ngay || '');
    const nextTietBatDau = Number(data.tiet_bat_dau_moi || buoi.tiet_bat_dau || 0);
    const nextSoTiet = Number(data.so_tiet_moi || buoi.so_tiet || 0);
    const nextPhong = String(data.phong_moi || buoi.phong || '');
    const nextGVDayThay = normalizedRequestedGVDayThay !== null
      ? normalizedRequestedGVDayThay
      : (buoi.giangvien_day_thay_id || null);

    const hasNoChange =
      currentNgay === nextNgay &&
      currentTietBatDau === nextTietBatDau &&
      currentSoTiet === nextSoTiet &&
      currentPhong === nextPhong &&
      currentGVDayThay === nextGVDayThay;

    if (hasNoChange) {
      const err = new Error('Đề xuất không có thay đổi so với lịch hiện tại. Vui lòng chỉnh ít nhất 1 thông tin trước khi gửi.');
      err.statusCode = 400;
      err.details = {
        type: 'no_change',
        ngay: currentNgay,
        tiet_trung: `${currentTietBatDau}-${currentTietBatDau + currentSoTiet - 1}`,
        phong: currentPhong || 'N/A'
      };
      throw err;
    }
  }

  const pendingProposal = await DeXuatChinhSua.findOne({
    where: {
      buoi_id,
      nguoi_de_xuat_id: user_gv_id,
      loai_de_xuat: loaiDeXuat,
      trang_thai: 'pending'
    },
    include: [
      {
        model: GiangVien,
        as: 'NguoiDeXuat',
        attributes: ['ma_gv', 'ho', 'ten', 'email', 'sdt']
      }
    ]
  });
  if (pendingProposal) {
    if (loaiDeXuat === 'chinh_sua') {
      const giangVienChinhId = buoi.LopHocPhan.giangvien_id;
      const normalizedGvDayThayMoiId =
        data.giangvien_day_thay_moi_id && data.giangvien_day_thay_moi_id === giangVienChinhId
          ? null
          : (data.giangvien_day_thay_moi_id || null);

      const payload = {
        ngay_moi: data.ngay_moi || buoi.ngay,
        tiet_bat_dau_moi: data.tiet_bat_dau_moi || buoi.tiet_bat_dau,
        so_tiet_moi: data.so_tiet_moi || buoi.so_tiet,
        phong_moi: data.phong_moi || buoi.phong,
        giangvien_day_thay_moi_id: normalizedGvDayThayMoiId,
        ly_do: data.ly_do || pendingProposal.ly_do
      };

      const effectiveLecturerId = resolveEffectiveLecturerId({
        proposalSubstituteId: payload.giangvien_day_thay_moi_id,
        currentSubstituteId: buoi.giangvien_day_thay_id || null,
        mainLecturerId: giangVienChinhId
      });

      const check = await checkConflict({
        ngay: payload.ngay_moi,
        tietBD: payload.tiet_bat_dau_moi,
        soTiet: payload.so_tiet_moi,
        phong: payload.phong_moi,
        giangvien_id: effectiveLecturerId,
        ignore_buoi_id: buoi_id
      });
      if (check.conflict) {
        const err = new Error(check.message);
        err.statusCode = 409;
        err.details = check.detail || null;
        throw err;
      }

      await pendingProposal.update(payload);
      return pendingProposal;
    }

    let gvThay = null;
    if (pendingProposal.giangvien_day_thay_moi_id) {
      gvThay = await GiangVien.findByPk(pendingProposal.giangvien_day_thay_moi_id, {
        attributes: ['ma_gv', 'ho', 'ten', 'email', 'sdt']
      });
    }

    const nguoiDeXuat = pendingProposal.NguoiDeXuat;
    const nguoiLienQuan = gvThay || nguoiDeXuat;
    const ngayPending = pendingProposal.ngay_moi || buoi.ngay;
    const tietStartPending = pendingProposal.tiet_bat_dau_moi || buoi.tiet_bat_dau;
    const soTietPending = pendingProposal.so_tiet_moi || buoi.so_tiet;
    const tietEndPending = tietStartPending + soTietPending - 1;
    const monHoc = buoi?.LopHocPhan?.MonHoc;
    const tenLop = (buoi?.LopHocPhan?.DanhSachLopHanhChinh || []).map(l => l.ten_lop).join(', ');

    const tenNguoi = nguoiLienQuan ? `${nguoiLienQuan.ho} ${nguoiLienQuan.ten}` : 'N/A';
    const maNguoi = nguoiLienQuan?.ma_gv || 'N/A';

    const err = new Error(
      `Buổi học này đã có đề xuất đang chờ duyệt của ${tenNguoi} (${maNguoi}). Vui lòng chờ admin xử lý.`
    );
    err.statusCode = 409;
    err.details = {
      type: 'pending_proposal',
      dexuat_id: pendingProposal.dexuat_id,
      buoi_id,
      ngay: ngayPending,
      tiet_trung: `${tietStartPending}-${tietEndPending}`,
      phong: pendingProposal.phong_moi || buoi.phong || null,
      ten_mon: monHoc?.ten_mon || 'N/A',
      ma_mon: monHoc?.ma_mon || 'N/A',
      ten_lop: tenLop || 'N/A',
      giang_vien: tenNguoi,
      ma_gv: maNguoi,
      email: nguoiLienQuan?.email || null,
      sdt: nguoiLienQuan?.sdt || null,
      nguoi_de_xuat: nguoiDeXuat ? `${nguoiDeXuat.ho} ${nguoiDeXuat.ten}` : null,
      ma_nguoi_de_xuat: nguoiDeXuat?.ma_gv || null
    };
    throw err;
  }

    const giangVienChinhId = buoi.LopHocPhan.giangvien_id;
    const normalizedGvDayThayMoiId =
      data.giangvien_day_thay_moi_id && data.giangvien_day_thay_moi_id === giangVienChinhId
        ? null
        : (data.giangvien_day_thay_moi_id || null);
    const effectiveLecturerId = resolveEffectiveLecturerId({
      proposalSubstituteId: normalizedGvDayThayMoiId,
      currentSubstituteId: buoi.giangvien_day_thay_id || null,
      mainLecturerId: giangVienChinhId
    });

    const check = await checkConflict({
        ngay: data.ngay_moi || buoi.ngay,
        tietBD: data.tiet_bat_dau_moi || buoi.tiet_bat_dau,
        soTiet: data.so_tiet_moi || buoi.so_tiet,
        phong: data.phong_moi || buoi.phong,
        giangvien_id: effectiveLecturerId,
        ignore_buoi_id: buoi_id
    });
    if (check.conflict) {
      const err = new Error(check.message);
      err.statusCode = 409;
      err.details = check.detail || null;
      throw err;
    }

    return await DeXuatChinhSua.create({
        buoi_id, 
        nguoi_de_xuat_id: user_gv_id,
      loai_de_xuat: loaiDeXuat,
        ngay_moi: data.ngay_moi, 
        tiet_bat_dau_moi: data.tiet_bat_dau_moi,
        so_tiet_moi: data.so_tiet_moi, 
        phong_moi: data.phong_moi,
        giangvien_day_thay_moi_id: normalizedGvDayThayMoiId,
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
// const xuLyPheDuyet = async (dexuat_id, status, admin_id, phan_hoi) => {
//     const t = await sequelize.transaction();
//     try {
//         const dx = await DeXuatChinhSua.findByPk(dexuat_id, { include: [{ model: BuoiHoc, as: 'BuoiHoc' }] });
//         if (!dx || dx.trang_thai !== 'pending') throw new Error("Đề xuất không hợp lệ.");

//         if (status === 'approved') {
//             const buoi = dx.BuoiHoc;

//             if (dx.loai_de_xuat === 'mo_lai') {
//                 // Mở lại buổi học: đặt lại trạng thái và xóa dữ liệu điểm danh cũ
//                 await BuoiHoc.update(
//                     { trangthai: 'scheduled', ghi_chu: `Admin mở lại: ${dx.ly_do}`, is_override: true },
//                     { where: { buoi_id: dx.buoi_id }, transaction: t }
//                 );
//             } else {
//                 // Chỉnh sửa thông tin buổi học
//                 const updateData = {
//                     ngay: dx.ngay_moi || buoi.ngay,
//                     phong: dx.phong_moi || buoi.phong,
//                     tiet_bat_dau: dx.tiet_bat_dau_moi || buoi.tiet_bat_dau,
//                     so_tiet: dx.so_tiet_moi || buoi.so_tiet,
//                     giangvien_day_thay_id: dx.giangvien_day_thay_moi_id || buoi.giangvien_day_thay_id,
//                     ghi_chu: `Admin duyệt: ${dx.ly_do}`
//                 };
//                 await BuoiHoc.update(updateData, { where: { buoi_id: dx.buoi_id }, transaction: t });
//             }
//         }

//         await dx.update({ trang_thai: status, nguoi_duyet_id: admin_id, phan_hoi_admin: phan_hoi }, { transaction: t });
//         await t.commit();
//         return { success: true };
//     } catch (error) { await t.rollback(); throw error; }
// };



// const xuLyPheDuyet = async (dexuat_id, status, admin_id, phan_hoi) => {
//     const t = await sequelize.transaction();
//     try {
//         const dx = await DeXuatChinhSua.findByPk(dexuat_id, { include: [{ model: BuoiHoc, as: 'BuoiHoc' }] });
//         if (!dx || dx.trang_thai !== 'pending') throw new Error("Đề xuất không hợp lệ.");

//         if (status === 'approved') {
//             const buoi = dx.BuoiHoc;
//             const ngayMoi = dx.ngay_moi || buoi.ngay;

//             // CHẶN LỖI UNIQUE: Kiểm tra ngày mới có bị trùng lịch cũ không
//             if (ngayMoi !== buoi.ngay) {
//                 const checkExist = await BuoiHoc.findOne({
//                     where: { lophocphan_id: buoi.lophocphan_id, ngay: ngayMoi, buoi_id: { [Op.ne]: buoi.buoi_id } }
//                 });
//                 if (checkExist) throw new Error(`Lớp này đã có lịch vào ngày ${ngayMoi}. Không thể dời trùng.`);
//             }

//             const updateData = {
//                 ngay: ngayMoi,
//                 phong: dx.phong_moi || buoi.phong,
//                 tiet_bat_dau: dx.tiet_bat_dau_moi || buoi.tiet_bat_dau,
//                 so_tiet: dx.so_tiet_moi || buoi.so_tiet,
//                 giangvien_day_thay_id: dx.giangvien_day_thay_moi_id || buoi.giangvien_day_thay_id,
//                 ghi_chu: `Admin duyệt: ${dx.ly_do}`,
//                 is_override: true
//             };

//             // NẾU DỜI NGÀY: 
//             // 1. Chuyển trạng thái về 'scheduled' để giảng viên điểm danh lại ngày mới.
//             // 2. Xóa dữ liệu điểm danh cũ để mẫu số thống kê (tong_buoi) giảm đi 1 ngay lập tức.
//             if (ngayMoi !== buoi.ngay) {
//                 updateData.trangthai = 'scheduled';
//                 await db.DiemDanh.destroy({ where: { buoi_id: buoi.buoi_id }, transaction: t });
//             }

//             await BuoiHoc.update(updateData, { where: { buoi_id: buoi.buoi_id }, transaction: t });
//         }

//         await dx.update({ trang_thai: status, nguoi_duyet_id: admin_id, phan_hoi_admin: phan_hoi }, { transaction: t });
//         await t.commit();
//         return { success: true };
//     } catch (error) { await t.rollback(); throw error; }
// };



// const xuLyPheDuyet = async (dexuat_id, status, admin_id, phan_hoi) => {
//     const t = await sequelize.transaction();
//     try {
//         const dx = await DeXuatChinhSua.findByPk(dexuat_id, { include: [{ model: BuoiHoc, as: 'BuoiHoc' }] });
//         if (!dx || dx.trang_thai !== 'pending') throw new Error("Đề xuất không hợp lệ.");

//         if (status === 'approved') {
//             const buoi = dx.BuoiHoc;
//             const ngayMoi = dx.ngay_moi || buoi.ngay;

//             // 1. CHẶN LỖI UNIQUE (Logic cũ - Giữ nguyên)
//             if (ngayMoi !== buoi.ngay) {
//                 const checkExist = await BuoiHoc.findOne({
//                     where: { 
//                         lophocphan_id: buoi.lophocphan_id, 
//                         ngay: ngayMoi, 
//                         buoi_id: { [Op.ne]: buoi.buoi_id } 
//                     }
//                 });
//                 if (checkExist) throw new Error(`Lớp này đã có lịch vào ngày ${ngayMoi}. Không thể dời trùng.`);
//             }

//             // 2. Chuẩn bị dữ liệu cập nhật (Giữ nguyên các field cũ)
//             const updateData = {
//                 ngay: ngayMoi,
//                 phong: dx.phong_moi || buoi.phong,
//                 tiet_bat_dau: dx.tiet_bat_dau_moi || buoi.tiet_bat_dau,
//                 so_tiet: dx.so_tiet_moi || buoi.so_tiet,
//                 giangvien_day_thay_id: dx.giangvien_day_thay_moi_id || buoi.giangvien_day_thay_id,
//                 ghi_chu: `Admin duyệt: ${dx.ly_do}`,
//                 is_override: true,
//                 // THÊM LOGIC: Luôn đưa về 'scheduled' để giảng viên có thể điểm danh lại/sửa đổi
//                 trangthai: 'scheduled' 
//             };

//             // 3. Xử lý dữ liệu điểm danh (Logic cũ có chỉnh sửa nhẹ)
//             if (ngayMoi !== buoi.ngay) {
//                 // Nếu dời sang ngày khác: Xóa dữ liệu cũ vì buổi đó coi như chưa diễn ra (Logic cũ)
//                 await db.DiemDanh.destroy({ where: { buoi_id: buoi.buoi_id }, transaction: t });
//             } 
//             // Lưu ý: Nếu CÙNG NGÀY, chúng ta KHÔNG xóa DiemDanh, chỉ đổi trạng thái buổi học 
//             // để giảng viên vào sửa trên nền dữ liệu cũ.

//             await BuoiHoc.update(updateData, { where: { buoi_id: buoi.buoi_id }, transaction: t });
//         }

//         // 4. Cập nhật trạng thái đề xuất (Logic cũ)
//         await dx.update({ 
//             trang_thai: status, 
//             nguoi_duyet_id: admin_id, 
//             phan_hoi_admin: phan_hoi 
//         }, { transaction: t });

//         await t.commit();
//         return { success: true };
//     } catch (error) { 
//         if (t) await t.rollback(); 
//         throw error; 
//     }
// };

const xuLyPheDuyet = async (dexuat_id, status, admin_id, phan_hoi) => {
    const t = await sequelize.transaction();
    try {
        const dx = await DeXuatChinhSua.findByPk(dexuat_id, { 
            include: [{ model: BuoiHoc, as: 'BuoiHoc' }] 
        });
        
        if (!dx || dx.trang_thai !== 'pending') throw new Error("Đề xuất không hợp lệ.");

        if (status === 'approved') {
            const buoi = dx.BuoiHoc;
            const ngayMoi = dx.ngay_moi || buoi.ngay;

            // 1. Kiểm tra trùng lịch (Giữ nguyên logic cũ)
            if (ngayMoi !== buoi.ngay) {
                const checkExist = await BuoiHoc.findOne({
                    where: { 
                        lophocphan_id: buoi.lophocphan_id, 
                        ngay: ngayMoi, 
                        buoi_id: { [Op.ne]: buoi.buoi_id } 
                    }
                });
                if (checkExist) throw new Error(`Lớp đã có lịch vào ngày ${ngayMoi}.`);
            }

            // 2. Chuẩn bị dữ liệu cập nhật
            const updateData = {
                ngay: ngayMoi,
                phong: dx.phong_moi || buoi.phong,
                tiet_bat_dau: dx.tiet_bat_dau_moi || buoi.tiet_bat_dau,
                so_tiet: dx.so_tiet_moi || buoi.so_tiet,
                // Logic dạy thay: Nếu đề xuất có GV dạy thay mới thì lấy, ko thì giữ nguyên GV cũ của buổi đó
                giangvien_day_thay_id: dx.giangvien_day_thay_moi_id !== undefined ? dx.giangvien_day_thay_moi_id : buoi.giangvien_day_thay_id,
                ghi_chu: `Admin duyệt: ${dx.ly_do}`,
                is_override: true,
                trangthai: 'scheduled' // Luôn mở lại để GV (chính hoặc dạy thay) vào điểm danh
            };

            // 3. Xử lý điểm danh khi dời ngày
            if (ngayMoi !== buoi.ngay) {
                // Xóa điểm danh cũ vì đây là buổi học ở thời điểm mới, GV dạy thay mới cần điểm danh từ đầu
                await db.DiemDanh.destroy({ where: { buoi_id: buoi.buoi_id }, transaction: t });
            }

            await BuoiHoc.update(updateData, { where: { buoi_id: buoi.buoi_id }, transaction: t });
        }

        // 4. Cập nhật trạng thái đề xuất
        await dx.update({ 
            trang_thai: status, 
            nguoi_duyet_id: admin_id, 
            phan_hoi_admin: phan_hoi 
        }, { transaction: t });

        await t.commit();
        return { success: true };
    } catch (error) { 
        if (t) await t.rollback(); 
        throw error; 
    }
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
