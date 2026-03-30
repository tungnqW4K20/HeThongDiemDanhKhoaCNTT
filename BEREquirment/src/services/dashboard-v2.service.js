'use strict';
const db = require('../models');
const { Op } = require('sequelize');

const buildBoMonFilter = (boMonId) => {
    if (!boMonId) return null;
    return {
        [Op.or]: [
            { bomon_id: boMonId },
            { chuyennganh_id: boMonId }
        ]
    };
};

const buildMonHocScopeWhere = (scope = {}, boMonId = null) => {
    const where = {};
    const andConditions = [];

    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;
    const targetChuyenNganhId = scope.role === 'truongbomon' ? scope.chuyennganh_id : null;

    if (targetKhoaId) where.khoa_id = targetKhoaId;

    const scopeBoMonFilter = buildBoMonFilter(targetChuyenNganhId);
    const selectedBoMonFilter = buildBoMonFilter(boMonId);
    if (scopeBoMonFilter) andConditions.push(scopeBoMonFilter);
    if (selectedBoMonFilter) andConditions.push(selectedBoMonFilter);

    if (andConditions.length === 1) {
        Object.assign(where, andConditions[0]);
    } else if (andConditions.length > 1) {
        where[Op.and] = andConditions;
    }

    return where;
};

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
const getOverallAttendance = async (hocky_id, scope = {}) => {
    if (scope.role === 'truongbomon' && !scope.chuyennganh_id) {
        return { success: true, data: [] };
    }

    // Nếu không có hocky_id, tìm mặc định
    let targetId = hocky_id;
    if (!targetId) {
        const hk = await getSemesters();
        targetId = hk.defaultId;
    }

    if (!targetId) return { success: true, data: [] };

    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;
    const targetChuyenNganhId = scope.role === 'truongbomon' ? scope.chuyennganh_id : null;

    const monHocWhere = {};
    if (targetKhoaId) monHocWhere.khoa_id = targetKhoaId;
    if (targetChuyenNganhId) {
        monHocWhere[Op.or] = [
            { bomon_id: targetChuyenNganhId },
            { chuyennganh_id: targetChuyenNganhId }
        ];
    }

    const data = await db.LopHocPhan.findAll({
        where: { hocky_id: targetId },
        attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'loai_hoc_phan'],
        include: [
            {
                model: db.MonHoc,
                attributes: ['monhoc_id', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
                where: Object.keys(monHocWhere).length > 0 ? monHocWhere : undefined,
                required: Object.keys(monHocWhere).length > 0
            },
            {
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                attributes: ['lop_hanhchinh_id', 'chuyennganh_id'],
                through: { attributes: [] },
                required: false
            },
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
const getClassDetailAttendance = async (lophocphan_id, scope = {}) => {
    if (scope.role === 'truongbomon' && !scope.chuyennganh_id) {
        throw new Error('Tài khoản trưởng bộ môn chưa được gán bộ môn để truy cập dữ liệu');
    }

    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;
    const targetChuyenNganhId = scope.role === 'truongbomon' ? scope.chuyennganh_id : null;

    const monHocWhere = {};
    if (targetKhoaId) monHocWhere.khoa_id = targetKhoaId;
    if (targetChuyenNganhId) {
        monHocWhere[Op.or] = [
            { bomon_id: targetChuyenNganhId },
            { chuyennganh_id: targetChuyenNganhId }
        ];
    }

    const lhp = await db.LopHocPhan.findOne({
        where: { lophocphan_id },
        attributes: ['lophocphan_id', 'ten_lophocphan', 'tuan_hoc', 'loai_hoc_phan', 'ma_lop'],
        include: [
            {
                model: db.MonHoc,
                attributes: ['monhoc_id', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
                where: Object.keys(monHocWhere).length > 0 ? monHocWhere : undefined,
                required: Object.keys(monHocWhere).length > 0
            },
            {
                model: db.GiangVien,
                attributes: ['ho', 'ten', 'ma_gv']
            },
            {
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                attributes: ['ten_lop'],
                through: { attributes: [] },
                required: false
            }
        ]
    });

    if (!lhp) throw new Error("Lớp học phần không tồn tại hoặc bạn không có quyền truy cập");

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

const getDailyAttendanceReport = async ({ hocky_id, ngay, bomon_id } = {}, scope = {}) => {
    if (scope.role === 'truongbomon' && !scope.chuyennganh_id) {
        return {
            success: true,
            data: {
                ngay: new Date().toISOString().slice(0, 10),
                bo_mon_options: [],
                daily_classes: [],
                warnings_students: [],
                warnings_lecturers: []
            }
        };
    }

    const selectedDate = ngay || new Date().toISOString().slice(0, 10);
    const boMonScopeWhere = { isDeleted: false };
    if (scope.role === 'truongbomon' && scope.chuyennganh_id) {
        boMonScopeWhere.bomon_id = scope.chuyennganh_id;
    } else if (scope.khoa_id) {
        boMonScopeWhere.khoa_id = scope.khoa_id;
    }

    const boMonOptions = await db.BoMon.findAll({
        where: boMonScopeWhere,
        attributes: ['bomon_id', 'ma_bomon', 'ten_bomon'],
        order: [['ten_bomon', 'ASC']]
    });

    const monHocWhere = buildMonHocScopeWhere(scope, bomon_id || null);
    const lopHocPhanWhere = {};
    if (hocky_id) lopHocPhanWhere.hocky_id = hocky_id;

    const dailyBuoiHoc = await db.BuoiHoc.findAll({
        where: {
            ngay: selectedDate,
            trangthai: { [Op.ne]: 'cancelled' }
        },
        attributes: ['buoi_id', 'lophocphan_id', 'ngay', 'trangthai', 'tiet_bat_dau', 'so_tiet', 'phong'],
        include: [
            {
                model: db.LopHocPhan,
                as: 'LopHocPhan',
                required: true,
                where: lopHocPhanWhere,
                attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'hocky_id', 'giangvien_id'],
                include: [
                    {
                        model: db.MonHoc,
                        attributes: ['monhoc_id', 'bomon_id', 'chuyennganh_id', 'khoa_id'],
                        where: Object.keys(monHocWhere).length > 0 ? monHocWhere : undefined,
                        required: Object.keys(monHocWhere).length > 0
                    },
                    {
                        model: db.GiangVien,
                        attributes: ['giangvien_id', 'ho', 'ten', 'ma_gv']
                    },
                    {
                        model: db.LopHanhChinh,
                        as: 'DanhSachLopHanhChinh',
                        attributes: ['ten_lop'],
                        through: { attributes: [] },
                        required: false
                    }
                ]
            },
            {
                model: db.DiemDanh,
                as: 'DanhSachDiemDanh',
                attributes: ['sinhvien_id', 'trangthai'],
                required: false
            }
        ],
        order: [['tiet_bat_dau', 'ASC']]
    });

    const classIds = [...new Set(dailyBuoiHoc.map((b) => b.lophocphan_id).filter(Boolean))];
    if (classIds.length === 0) {
        return {
            success: true,
            data: {
                ngay: selectedDate,
                bo_mon_options: boMonOptions,
                daily_classes: [],
                warnings_students: [],
                warnings_lecturers: []
            }
        };
    }

    const dangKyHocRows = await db.DangKyHoc.findAll({
        where: {
            lophocphan_id: { [Op.in]: classIds },
            trangthai: 'active'
        },
        attributes: ['lophocphan_id', 'sinhvien_id'],
        include: [{ model: db.SinhVien, attributes: ['ma_sv', 'ten'] }]
    });

    const completedBuoiHoc = await db.BuoiHoc.findAll({
        where: {
            lophocphan_id: { [Op.in]: classIds },
            trangthai: 'completed',
            ngay: { [Op.lte]: selectedDate }
        },
        attributes: ['buoi_id', 'lophocphan_id']
    });

    const completedBuoiIds = completedBuoiHoc.map((b) => b.buoi_id);
    const completedAttendances = completedBuoiIds.length > 0
        ? await db.DiemDanh.findAll({
            where: { buoi_id: { [Op.in]: completedBuoiIds } },
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

    const warningsStudents = [];
    classIds.forEach((classId) => {
        const regs = regsByClass.get(classId) || [];
        const completedIds = completedByClass.get(classId) || [];
        if (regs.length === 0 || completedIds.length === 0) return;

        regs.forEach((reg) => {
            let absences = 0;
            completedIds.forEach((buoiId) => {
                const found = (attendanceByBuoi.get(buoiId) || []).find((a) => a.sinhvien_id === reg.sinhvien_id);
                if (found?.trangthai === 'absent') absences += 1;
            });

            const rate = (absences / completedIds.length) * 100;
            if (rate >= 20) {
                const lhp = dailyBuoiHoc.find((b) => b.lophocphan_id === classId)?.LopHocPhan;
                warningsStudents.push({
                    lophocphan_id: classId,
                    ten_lop: lhp?.ten_lophocphan || 'N/A',
                    ma_lop: lhp?.ma_lop || 'N/A',
                    sinhvien_id: reg.sinhvien_id,
                    ma_sv: reg.SinhVien?.ma_sv || 'N/A',
                    ten_sv: reg.SinhVien?.ten || 'N/A',
                    ti_le_vang: Number(rate.toFixed(2))
                });
            }
        });
    });

    const warningsLecturers = [];
    const dailyClasses = dailyBuoiHoc.map((buoi) => {
        const lhp = buoi.LopHocPhan;
        const registrations = regsByClass.get(lhp.lophocphan_id) || [];
        const diemDanhRows = buoi.DanhSachDiemDanh || [];
        const distinctMarked = new Set(diemDanhRows.map((d) => d.sinhvien_id)).size;
        const soVang = diemDanhRows.filter((d) => d.trangthai === 'absent').length;
        const soCoMat = diemDanhRows.filter((d) => d.trangthai === 'present').length;
        const tyLeVangBuoi = registrations.length > 0 ? Number(((soVang / registrations.length) * 100).toFixed(2)) : 0;

        const gvName = lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'N/A';
        const lopHanhChinh = (lhp.DanhSachLopHanhChinh || []).map((x) => x.ten_lop).join(', ');

        if (distinctMarked === 0) {
            warningsLecturers.push({
                buoi_id: buoi.buoi_id,
                lophocphan_id: lhp.lophocphan_id,
                ten_lop: lhp.ten_lophocphan,
                ma_lop: lhp.ma_lop,
                giang_vien: gvName,
                tiet_bat_dau: buoi.tiet_bat_dau,
                so_tiet: buoi.so_tiet,
                phong: buoi.phong || lhp.phong || ''
            });
        }

        return {
            buoi_id: buoi.buoi_id,
            lophocphan_id: lhp.lophocphan_id,
            ten_lop: lhp.ten_lophocphan,
            ma_lop: lhp.ma_lop,
            giang_vien: gvName,
            lop_hanh_chinh: lopHanhChinh,
            tiet_bat_dau: buoi.tiet_bat_dau,
            so_tiet: buoi.so_tiet,
            phong: buoi.phong || lhp.phong || '',
            tong_sv: registrations.length,
            da_diem_danh: distinctMarked,
            so_vang: soVang,
            so_co_mat: soCoMat,
            ti_le_vang_buoi: tyLeVangBuoi,
            trang_thai_diem_danh: distinctMarked > 0 ? 'Đã điểm danh' : 'Chưa điểm danh'
        };
    });

    return {
        success: true,
        data: {
            ngay: selectedDate,
            bo_mon_options: boMonOptions,
            daily_classes: dailyClasses,
            warnings_students: warningsStudents,
            warnings_lecturers: warningsLecturers
        }
    };
};

module.exports = { getSemesters, getOverallAttendance, getClassDetailAttendance, getDailyAttendanceReport };