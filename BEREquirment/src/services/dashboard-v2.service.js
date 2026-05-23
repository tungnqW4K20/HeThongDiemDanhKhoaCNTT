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
    const monHocWhere = {};
    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;
    const targetChuyenNganhId = scope.role === 'truongbomon' ? scope.chuyennganh_id : null;

    if (targetKhoaId && !targetChuyenNganhId) {
        // Lãnh đạo khoa: Lọc theo khoa_id của môn học HOẶC khoa_id của bộ môn (sẽ được xử lý ở include BoMon)
        // Lưu ý: Ở đây ta chỉ set khoa_id cho MonHoc, phần OR BoMon.khoa_id sẽ xử lý bằng $path$ ở main where nếu cần.
        // Tuy nhiên, để đơn giản và tương thích với cấu trúc hiện tại của service này:
        monHocWhere[Op.or] = [
            { khoa_id: targetKhoaId },
            { '$BoMon.khoa_id$': targetKhoaId }
        ];
    }

    if (targetChuyenNganhId) {
        monHocWhere[Op.or] = [
            { bomon_id: targetChuyenNganhId },
            { chuyennganh_id: targetChuyenNganhId }
        ];
    }

    // Nếu front-end truyền lên 1 boMonId cụ thể (từ filter)
    if (boMonId && boMonId !== 'all') {
        const selectedBoMonFilter = {
            [Op.or]: [
                { bomon_id: boMonId },
                { chuyennganh_id: boMonId }
            ]
        };

        if (monHocWhere[Op.and]) {
            monHocWhere[Op.and].push(selectedBoMonFilter);
        } else if (Object.keys(monHocWhere).length > 0) {
            const existingOr = monHocWhere[Op.or];
            delete monHocWhere[Op.or];
            monHocWhere[Op.and] = [
                { [Op.or]: existingOr },
                selectedBoMonFilter
            ];
        } else {
            monHocWhere[Op.or] = selectedBoMonFilter[Op.or];
        }
    }

    return monHocWhere;
};

const hasWhereConditions = (whereObj = {}) => Reflect.ownKeys(whereObj).length > 0;

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
const getOverallAttendance = async (hocky_id, scope = {}, bomon_id = null) => {
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

    const monHocWhere = buildMonHocScopeWhere(scope, bomon_id || null);
    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;

    const data = await db.LopHocPhan.findAll({
        where: {
            [Op.and]: [
                { hocky_id: targetId },
                // Nếu là lãnh đạo khoa, hỗ trợ xem thêm nếu có lớp hành chính thuộc khoa học môn khoa khác
                (scope.role === 'lanhdao' && targetKhoaId) ? {
                    [Op.or]: [
                        { '$MonHoc.khoa_id$': targetKhoaId },
                        { '$MonHoc.BoMon.khoa_id$': targetKhoaId },
                        { '$DanhSachLopHanhChinh.khoa_id$': targetKhoaId }
                    ]
                } : {}
            ]
        },
        attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'loai_hoc_phan'],
        subQuery: false,
        include: [
            {
                model: db.MonHoc,
                attributes: ['monhoc_id', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
                where: (scope.role === 'truongbomon' || (bomon_id && bomon_id !== 'all')) ? monHocWhere : undefined,
                required: (scope.role === 'truongbomon' || (bomon_id && bomon_id !== 'all')),
                include: [{ model: db.BoMon, as: 'BoMon', attributes: ['khoa_id'] }]
            },
            {
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                attributes: ['lop_hanhchinh_id', 'chuyennganh_id', 'khoa_id'],
                through: { attributes: [] },
                required: false
            },
            {
                model: db.GiangVien,
                attributes: ['ho', 'ten']
            }
        ]
    });

    const lhpIds = data.map(lhp => lhp.lophocphan_id);
    const countsMap = new Map();
    lhpIds.forEach(id => {
        countsMap.set(id, { total: 0, absent: 0 });
    });

    if (lhpIds.length > 0) {
        const buoiRows = await db.BuoiHoc.findAll({
            where: { lophocphan_id: { [Op.in]: lhpIds } },
            attributes: ['buoi_id', 'lophocphan_id'],
            raw: true
        });

        if (buoiRows.length > 0) {
            const buoiToLhp = {};
            buoiRows.forEach(r => {
                buoiToLhp[r.buoi_id] = r.lophocphan_id;
            });
            const buoiIds = buoiRows.map(r => r.buoi_id);

            const counts = await db.sequelize.query(`
                SELECT buoi_id, trangthai, COUNT(*) AS count
                FROM DiemDanh
                WHERE buoi_id IN (:buoiIds)
                GROUP BY buoi_id, trangthai
            `, {
                replacements: { buoiIds },
                type: db.sequelize.QueryTypes.SELECT
            });

            counts.forEach(row => {
                const lhpId = buoiToLhp[row.buoi_id];
                if (lhpId) {
                    const statsObj = countsMap.get(lhpId);
                    if (statsObj) {
                        const c = parseInt(row.count) || 0;
                        statsObj.total += c;
                        if (row.trangthai === 'absent') {
                            statsObj.absent += c;
                        }
                    }
                }
            });
        }
    }

    const stats = data.map(lhp => {
        const statsObj = countsMap.get(lhp.lophocphan_id) || { total: 0, absent: 0 };
        const total = statsObj.total;
        const absent = statsObj.absent;

        return {
            lophocphan_id: lhp.lophocphan_id,
            ten_lop: lhp.ten_lophocphan,
            ma_lop: lhp.ma_lop,
            loai: lhp.loai_hoc_phan,
            giang_vien: lhp.GiangVien ? `${lhp.GiangVien.ho} ${lhp.GiangVien.ten}` : 'N/A',
            tong_ban_ghi_diem_danh: total,
            ti_le_vang: total > 0 ? parseFloat((absent / total * 100).toFixed(2)) : 0
        };
    }).filter((item) => item.tong_ban_ghi_diem_danh > 0);

    return { success: true, data: stats };
};

/**
 * Chi tiết điểm danh sinh viên & Thông tin bổ trợ (GV, Lớp hành chính)
 */
const getClassDetailAttendance = async (lophocphan_id, scope = {}) => {
    if (scope.role === 'truongbomon' && !scope.chuyennganh_id) {
        throw new Error('Tài khoản trưởng bộ môn chưa được gán bộ môn để truy cập dữ liệu');
    }

    const monHocWhere = buildMonHocScopeWhere(scope);

    const lhp = await db.LopHocPhan.findOne({
        where: { lophocphan_id },
        attributes: ['lophocphan_id', 'ten_lophocphan', 'tuan_hoc', 'loai_hoc_phan', 'ma_lop'],
        include: [
            {
                model: db.MonHoc,
                attributes: ['monhoc_id', 'khoa_id', 'chuyennganh_id', 'bomon_id'],
                where: scope.role === 'truongbomon' ? monHocWhere : undefined,
                required: scope.role === 'truongbomon',
                include: [{ model: db.BoMon, as: 'BoMon', attributes: ['khoa_id'] }]
            },
            {
                model: db.GiangVien,
                attributes: ['ho', 'ten', 'ma_gv']
            },
            {
                model: db.LopHanhChinh,
                as: 'DanhSachLopHanhChinh',
                attributes: ['ten_lop', 'khoa_id'],
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
            ti_le_vang: Number(tiLeVang.toFixed(2)),
            so_buoi_vang: soBuoiVang,
            tong_so_buoi: tongSoBuoiKeHoach,
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
            lophocphan_id: lhp.lophocphan_id,
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

const getDailyAttendanceReport = async ({ hocky_id, ngay, bomon_id, from_ngay, to_ngay } = {}, scope = {}) => {
    if (scope.role === 'truongbomon' && !scope.chuyennganh_id) {
        return {
            success: true,
            data: {
                ngay: new Date().toISOString().slice(0, 10),
                from_ngay: null,
                to_ngay: null,
                bo_mon_options: [],
                daily_classes: [],
                warnings_students: [],
                warnings_lecturers: []
            }
        };
    }

    const today = new Date().toISOString().slice(0, 10);
    const hasRange = Boolean(from_ngay && to_ngay);
    const selectedDate = ngay || today;
    let startDate = hasRange ? from_ngay : selectedDate;
    let endDate = hasRange ? to_ngay : selectedDate;

    // Chuẩn hóa khoảng ngày để tránh input đảo ngược từ client.
    if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
    }

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
    const targetKhoaId = (scope.role === 'lanhdao' || scope.role === 'truongbomon') ? scope.khoa_id : null;

    const buoiHocDateFilter = hasRange
        ? { [Op.between]: [startDate, endDate] }
        : selectedDate;

    const dailyBuoiHoc = await db.BuoiHoc.findAll({
        where: {
            [Op.and]: [
                { ngay: buoiHocDateFilter },
                { trangthai: { [Op.ne]: 'cancelled' } },
                // Lãnh đạo khoa: Lọc theo khoa của môn học HOẶC lớp hành chính thuộc khoa
                (scope.role === 'lanhdao' && targetKhoaId) ? {
                    [Op.or]: [
                        { '$LopHocPhan.MonHoc.khoa_id$': targetKhoaId },
                        { '$LopHocPhan.MonHoc.BoMon.khoa_id$': targetKhoaId },
                        { '$LopHocPhan.DanhSachLopHanhChinh.khoa_id$': targetKhoaId }
                    ]
                } : {}
            ]
        },
        attributes: ['buoi_id', 'lophocphan_id', 'ngay', 'trangthai', 'tiet_bat_dau', 'so_tiet', 'phong'],
        subQuery: false,
        include: [
            {
                model: db.LopHocPhan,
                as: 'LopHocPhan',
                required: true,
                where: hocky_id ? { hocky_id } : {},
                attributes: ['lophocphan_id', 'ten_lophocphan', 'ma_lop', 'hocky_id', 'giangvien_id', 'tuan_hoc'],
                include: [
                    {
                        model: db.MonHoc,
                        attributes: ['monhoc_id', 'bomon_id', 'chuyennganh_id', 'khoa_id'],
                        where: (scope.role === 'truongbomon' || (bomon_id && bomon_id !== 'all')) ? monHocWhere : undefined,
                        required: (scope.role === 'truongbomon' || (bomon_id && bomon_id !== 'all')),
                        include: [{ model: db.BoMon, as: 'BoMon', attributes: ['khoa_id'] }]
                    },
                    {
                        model: db.GiangVien,
                        attributes: ['giangvien_id', 'ho', 'ten', 'ma_gv']
                    },
                    {
                        model: db.LopHanhChinh,
                        as: 'DanhSachLopHanhChinh',
                        attributes: ['ten_lop', 'khoa_id'],
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
                from_ngay: hasRange ? startDate : null,
                to_ngay: hasRange ? endDate : null,
                bo_mon_options: boMonOptions,
                daily_classes: [],
                warnings_students: [],
                warnings_lecturers: [],
                total_classes_count: 0,
                warnings_students_count: 0,
                warnings_lecturers_count: 0
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
            trangthai: 'completed'
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

        const lhp = dailyBuoiHoc.find((b) => b.lophocphan_id === classId)?.LopHocPhan;
        let tongBuoiKeHoach = completedIds.length;
        if (lhp?.tuan_hoc) {
            try {
                const tuanHocValue = Array.isArray(lhp.tuan_hoc)
                    ? lhp.tuan_hoc
                    : JSON.parse(lhp.tuan_hoc);
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
                warningsStudents.push({
                    lophocphan_id: classId,
                    ten_lop: lhp?.ten_lophocphan || 'N/A',
                    ma_lop: lhp?.ma_lop || 'N/A',
                    sinhvien_id: reg.sinhvien_id,
                    ma_sv: reg.SinhVien?.ma_sv || 'N/A',
                    ten_sv: reg.SinhVien?.ten || 'N/A',
                    ti_le_vang: Number(rate.toFixed(2)),
                    so_buoi_vang: absences,
                    tong_so_buoi: tongBuoiKeHoach
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
                ngay: buoi.ngay,
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
            ngay: buoi.ngay,
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
            from_ngay: hasRange ? startDate : null,
            to_ngay: hasRange ? endDate : null,
            bo_mon_options: boMonOptions,
            daily_classes: dailyClasses.sort((a, b) => {
                const dateCompare = String(a.ngay || '').localeCompare(String(b.ngay || ''));
                if (dateCompare !== 0) return dateCompare;
                return (a.tiet_bat_dau || 0) - (b.tiet_bat_dau || 0);
            }),
            warnings_students: warningsStudents,
            warnings_lecturers: warningsLecturers,
            total_classes_count: dailyClasses.length,
            warnings_students_count: warningsStudents.length,
            warnings_lecturers_count: warningsLecturers.length
        }
    };
};

module.exports = { getSemesters, getOverallAttendance, getClassDetailAttendance, getDailyAttendanceReport };