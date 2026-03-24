'use strict';
const db = require('../models');
const { Op } = require('sequelize');

/**
 * Lấy danh sách học kỳ và xác định học kỳ mặc định
 */
const getSemesters = async () => {
    const semesters = await db.HocKy.findAll({
        order: [['ngay_batdau', 'DESC']]
    });

    const today = new Date().toISOString().split('T')[0];
    
    // Tìm học kỳ hiện tại
    let defaultSemester = semesters.find(hk => 
        today >= hk.ngay_batdau && today <= hk.ngay_ketthuc
    );

    // Nếu không có học kỳ hiện tại, lấy cái gần nhất (đầu danh sách)
    if (!defaultSemester && semesters.length > 0) {
        defaultSemester = semesters[0];
    }

    return { 
        success: true, 
        data: semesters, 
        defaultId: defaultSemester ? defaultSemester.hocky_id : null 
    };
};

/**
 * Thống kê tổng quát tỷ lệ vắng theo từng lớp học phần
 */
const getOverallAttendance = async (hocky_id) => {
    // Nếu không có hocky_id, tìm mặc định
    let targetId = hocky_id;
    if (!targetId) {
        const hk = await getSemesters();
        targetId = hk.defaultId;
    }

    if (!targetId) return { success: true, data: [] };

    const data = await db.LopHocPhan.findAll({
        where: { hocky_id: targetId },
        attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'loai_hoc_phan'],
        include: [
            {
                model: db.GiangVien,
                attributes: ['ho', 'ten']
            },
            {
                model: db.BuoiHoc,
                as: 'DanhSachBuoiHoc',
                attributes: ['buoi_id'],
                include: [{
                    model: db.DiemDanh,
                    as: 'DanhSachDiemDanh',
                    attributes: ['trangthai']
                }]
            }
        ]
    });

    const stats = data.map(lhp => {
        let present = 0, absent = 0, late = 0, excused = 0;

        lhp.DanhSachBuoiHoc.forEach(buoi => {
            buoi.DanhSachDiemDanh.forEach(dd => {
                if (dd.trangthai === 'present') present++;
                else if (dd.trangthai === 'absent') absent++;
                else if (dd.trangthai === 'late') late++;
                else if (dd.trangthai === 'excused') excused++;
            });
        });

        const total = present + absent + late + excused;
        return {
            lophocphan_id: lhp.lophocphan_id,
            ten_lop: lhp.ten_lophocphan,
            ma_lop: lhp.ma_lop,
            loai: lhp.loai_hoc_phan,
            giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'N/A',
            ti_le_vang: total > 0 ? parseFloat((absent / total * 100).toFixed(2)) : 0
        };
    });

    return { success: true, data: stats };
};

/**
 * Chi tiết điểm danh sinh viên & Thông tin bổ trợ (GV, Lớp hành chính)
 */
const getClassDetailAttendance = async (lophocphan_id) => {
    const lhp = await db.LopHocPhan.findByPk(lophocphan_id, {
        attributes: ['lophocphan_id', 'ten_lophocphan', 'tuan_hoc', 'loai_hoc_phan', 'ma_lop'],
        include: [
            {
                model: db.GiangVien,
                attributes: ['ho', 'ten', 'ma_gv']
            },
            {
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                attributes: ['ten_lop'],
                through: { attributes: [] }
            }
        ]
    });

    if (!lhp) throw new Error("Lớp học phần không tồn tại");

    const tongSoBuoiKeHoach = lhp.tuan_hoc ? (Array.isArray(lhp.tuan_hoc) ? lhp.tuan_hoc.length : JSON.parse(lhp.tuan_hoc).length) : 0;

    const dsSinhVien = await db.DangKyHoc.findAll({
        where: { lophocphan_id },
        include: [{ model: db.SinhVien, attributes: ['sinhvien_id', 'ma_sv', 'ten'] }]
    });

    const dsBuoiHoc = await db.BuoiHoc.findAll({
        where: { lophocphan_id, trangthai: 'completed' },
        attributes: ['buoi_id', 'ngay'],
        order: [['ngay', 'ASC']]
    });

    const dsDiemDanh = await db.DiemDanh.findAll({
        where: { buoi_id: dsBuoiHoc.map(b => b.buoi_id) }
    });

    const studentsReport = dsSinhVien.map(dk => {
        const sv = dk.SinhVien;
        const attendanceOfSv = dsDiemDanh.filter(dd => dd.sinhvien_id === sv.sinhvien_id);
        const soBuoiVang = attendanceOfSv.filter(dd => dd.trangthai === 'absent').length;
        const tiLeVang = tongSoBuoiKeHoach > 0 ? (soBuoiVang / tongSoBuoiKeHoach) * 100 : 0;

        return {
            sinhvien_id: sv.sinhvien_id,
            ma_sv: sv.ma_sv,
            ten_sv: sv.ten,
            ti_le_vang: tiLeVang.toFixed(2),
            canh_bao: tiLeVang >= 20,
            history: dsBuoiHoc.map(buoi => ({
                ngay: buoi.ngay,
                trangthai: attendanceOfSv.find(dd => dd.buoi_id === buoi.buoi_id)?.trangthai || 'not_recorded'
            }))
        };
    });

    return {
        success: true,
        data: {
            ten_lophocphan: lhp.ten_lophocphan,
            ma_lop: lhp.ma_lop,
            loai_hoc_phan: lhp.loai_hoc_phan,
            giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'N/A',
            lop_hanh_chinh: lhp.DanhSachLopHanhChinh.map(l => l.ten_lop),
            tong_so_buoi_ke_hoach: tongSoBuoiKeHoach,
            so_buoi_da_hoc: dsBuoiHoc.length,
            danh_sach_sinh_vien: studentsReport
        }
    };
};

module.exports = { getSemesters, getOverallAttendance, getClassDetailAttendance };