'use strict';
const db = require('../models');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

const normalizeDate = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Ngày không hợp lệ.');
    }
    date.setHours(0, 0, 0, 0);
    return date;
};

const toDateOnly = (dateValue) => {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getMondayOfWeek = (dateValue) => {
    const date = normalizeDate(dateValue);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diffToMonday);
    return date;
};

const validateWeekStart = (value, min, max, fieldName) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (!Number.isInteger(num) || num < min || num > max) {
        throw new Error(`${fieldName} phải là số nguyên trong khoảng ${min}-${max}.`);
    }
    return num;
};

const normalizeSchoolYearName = (name) => {
    return String(name || '')
        .trim()
        .replace(/\s*-\s*/g, '-')
        .replace(/\s+/g, ' ');
};

const mapSequelizeError = (error) => {
    if (!error) return new Error('Có lỗi không xác định khi tạo năm học.');

    if (error.name === 'SequelizeUniqueConstraintError') {
        const hasTenNamHocField = Array.isArray(error.errors)
            && error.errors.some((item) => item.path === 'ten_namhoc');
        if (hasTenNamHocField) {
            return new Error('Năm học đã tồn tại. Vui lòng dùng tên năm học khác.');
        }
        return new Error('Dữ liệu bị trùng, vui lòng kiểm tra lại.');
    }

    if (error.name === 'SequelizeValidationError') {
        const firstMessage = Array.isArray(error.errors) && error.errors[0]?.message
            ? error.errors[0].message
            : 'Dữ liệu không hợp lệ.';
        return new Error(firstMessage);
    }

    return error;
};

const getAllNamHoc = async () => {
    return await db.NamHoc.findAll({
        order: [['ngay_batdau', 'DESC']]
    });
};

const getNamHocById = async (id) => {
    const namhoc = await db.NamHoc.findByPk(id, {
        include: [{ model: db.HocKy, as: 'DanhSachHocKy' }]
    });
    if (!namhoc) throw new Error("Năm học không tồn tại.");
    return namhoc;
};

const createNamHoc = async (data) => {
    const { ten_namhoc, ngay_batdau, ngay_ketthuc } = data;
    const tenNamHocNormalized = normalizeSchoolYearName(ten_namhoc);
    const hk1TuanBatDauCoLich = validateWeekStart(
        data.hk1_tuan_bat_dau_co_lich,
        1,
        22,
        'Tuần bắt đầu dạy của kỳ 1'
    ) ?? 1;
    const hk2TuanBatDauCoLich = validateWeekStart(
        data.hk2_tuan_bat_dau_co_lich,
        23,
        46,
        'Tuần bắt đầu dạy của kỳ 2'
    ) ?? 23;

    if (!tenNamHocNormalized || !ngay_batdau || !ngay_ketthuc) {
        throw new Error('Vui lòng nhập đầy đủ tên năm học, ngày bắt đầu và ngày kết thúc.');
    }

    const existingNamHoc = await db.NamHoc.findOne({ where: { ten_namhoc: tenNamHocNormalized } });
    if (existingNamHoc) {
        throw new Error('Năm học đã tồn tại. Vui lòng dùng tên năm học khác.');
    }

    const startDate = normalizeDate(ngay_batdau);
    const endDate = normalizeDate(ngay_ketthuc);

    // Logic: Ngày bắt đầu < Ngày kết thúc
    if (startDate >= endDate) {
        throw new Error("Ngày bắt đầu phải nhỏ hơn ngày kết thúc.");
    }

    const mondayWeek1 = getMondayOfWeek(startDate);
    const week46End = new Date(mondayWeek1.getTime() + (45 * WEEK_IN_MS) + (6 * DAY_IN_MS));
    if (endDate < week46End) {
        throw new Error(
            `Khoảng thời gian năm học phải bao phủ đủ 46 tuần (đến ít nhất ${toDateOnly(week46End)}).`
        );
    }

    const hk1StartDate = new Date(startDate);
    const hk1EndDate = new Date(mondayWeek1.getTime() + (21 * WEEK_IN_MS) + (6 * DAY_IN_MS)); // Kỳ 1: tuần 1 -> 22

    const hk2StartMonday = new Date(mondayWeek1.getTime() + (22 * WEEK_IN_MS)); // Kỳ 2: từ tuần 23
    const hk2StartDate = new Date(hk2StartMonday);
    const hk2EndDate = new Date(week46End);

    if (hk1EndDate < hk1StartDate || hk2EndDate < hk2StartDate) {
        throw new Error('Không thể tự khởi tạo học kỳ do mốc thời gian không hợp lệ.');
    }

    try {
        return await db.sequelize.transaction(async (transaction) => {
            const namHoc = await db.NamHoc.create({
                ten_namhoc: tenNamHocNormalized,
                ngay_batdau: toDateOnly(startDate),
                ngay_ketthuc: toDateOnly(endDate)
            }, { transaction });

            const hocKyData = [
                {
                    ten_hocky: `Học kỳ 1 (${tenNamHocNormalized})`,
                    ngay_batdau: toDateOnly(hk1StartDate),
                    ngay_ketthuc: toDateOnly(hk1EndDate),
                    ngay_monday_tuan_1: toDateOnly(mondayWeek1),
                    namhoc_id: namHoc.namhoc_id,
                    tuan_bat_dau_co_lich: hk1TuanBatDauCoLich
                },
                {
                    ten_hocky: `Học kỳ 2 (${tenNamHocNormalized})`,
                    ngay_batdau: toDateOnly(hk2StartDate),
                    ngay_ketthuc: toDateOnly(hk2EndDate),
                    ngay_monday_tuan_1: toDateOnly(hk2StartMonday),
                    namhoc_id: namHoc.namhoc_id,
                    tuan_bat_dau_co_lich: hk2TuanBatDauCoLich
                }
            ];

            const danhSachHocKy = await db.HocKy.bulkCreate(hocKyData, { transaction });

            return {
                ...namHoc.toJSON(),
                DanhSachHocKy: danhSachHocKy
            };
        });
    } catch (error) {
        throw mapSequelizeError(error);
    }
};

const updateNamHoc = async (id, data) => {
    const namhoc = await db.NamHoc.findByPk(id);
    if (!namhoc) throw new Error("Năm học không tồn tại.");

    const { ten_namhoc, ngay_batdau, ngay_ketthuc } = data;
    
    if (ngay_batdau && ngay_ketthuc) {
        if (new Date(ngay_batdau) >= new Date(ngay_ketthuc)) {
            throw new Error("Ngày bắt đầu phải nhỏ hơn ngày kết thúc.");
        }
    }

    return await namhoc.update({
        ten_namhoc,
        ngay_batdau,
        ngay_ketthuc
    });
};

const deleteNamHoc = async (id) => {
    const namhoc = await db.NamHoc.findByPk(id);
    if (!namhoc) throw new Error("Năm học không tồn tại.");

    // Ràng buộc dữ liệu: Không xóa nếu đã có Học kỳ
    const hasHocKy = await db.HocKy.findOne({ where: { namhoc_id: id } });
    if (hasHocKy) {
        throw new Error("Không thể xóa năm học này vì đã có các học kỳ liên quan.");
    }

    return await namhoc.destroy();
};

module.exports = {
    getAllNamHoc,
    getNamHocById,
    createNamHoc,
    updateNamHoc,
    deleteNamHoc
};