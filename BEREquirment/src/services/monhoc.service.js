const db = require('../models'); 
const { Op } = require('sequelize');

const normalizeBoMonPayload = async (payload = {}) => {
    const normalized = { ...payload };
    const boMonId = payload.bomon_id || payload.chuyennganh_id || null;

    if (!boMonId) {
        return normalized;
    }

    const boMon = await db.BoMon.findOne({
        where: { bomon_id: boMonId, isDeleted: false },
        attributes: ['bomon_id', 'khoa_id', 'ma_bomon', 'ten_bomon']
    });

    if (!boMon) {
        throw new Error('Bộ môn không tồn tại hoặc đã bị xóa');
    }

    let resolvedChuyenNganhId = null;
    if (payload.chuyennganh_id) {
        const existedChuyenNganh = await db.ChuyenNganh.findOne({
            where: { chuyennganh_id: payload.chuyennganh_id, isDeleted: false },
            attributes: ['chuyennganh_id']
        });
        resolvedChuyenNganhId = existedChuyenNganh ? existedChuyenNganh.chuyennganh_id : null;
    }

    if (!resolvedChuyenNganhId) {
        const matchedChuyenNganh = await db.ChuyenNganh.findOne({
            where: {
                khoa_id: boMon.khoa_id,
                isDeleted: false,
                [Op.or]: [
                    { ma_chuyennganh: boMon.ma_bomon },
                    { ten_chuyennganh: boMon.ten_bomon }
                ]
            },
            attributes: ['chuyennganh_id']
        });
        resolvedChuyenNganhId = matchedChuyenNganh ? matchedChuyenNganh.chuyennganh_id : null;
    }

    normalized.bomon_id = boMon.bomon_id;
    // Chỉ set bằng id chuyên ngành hợp lệ để không vỡ FK.
    normalized.chuyennganh_id = resolvedChuyenNganhId;
    if (!normalized.khoa_id) {
        normalized.khoa_id = boMon.khoa_id;
    }

    return normalized;
};

const getAllMonHoc = async (query, target_khoa_id = null, target_chuyennganh_id = null) => {
    try {
        const whereClause = { 
            isDeleted: false,
            [Op.and]: []
        };

        if (query.search) {
            whereClause[Op.and].push({
                [Op.or]: [
                    { ma_mon: { [Op.like]: `%${query.search}%` } },
                    { ten_mon: { [Op.like]: `%${query.search}%` } }
                ]
            });
        }

        // Lọc theo Khoa/Bộ môn
        if (target_chuyennganh_id) {
            whereClause[Op.and].push({
                [Op.or]: [
                    { bomon_id: target_chuyennganh_id },
                    { chuyennganh_id: target_chuyennganh_id }
                ]
            });
        } else if (target_khoa_id) {
            whereClause[Op.and].push({
                [Op.or]: [
                    { khoa_id: target_khoa_id },
                    { '$BoMon.khoa_id$': target_khoa_id }
                ]
            });
        }

        // Nếu mảng Op.and rỗng thì xóa đi để tránh lỗi query
        if (whereClause[Op.and].length === 0) delete whereClause[Op.and];

        const data = await db.MonHoc.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa',
                    attributes: ['ten_khoa', 'ma_khoa']
                },
                {
                    model: db.BoMon,
                    as: 'BoMon',
                    attributes: [
                        'bomon_id',
                        ['bomon_id', 'chuyennganh_id'],
                        ['ma_bomon', 'ma_chuyennganh'],
                        ['ten_bomon', 'ten_chuyennganh'],
                        'khoa_id'
                    ]
                }
            ],
            order: [['ten_mon', 'ASC']]
        });
        return { success: true, data };
    } catch (error) {
        throw error;
    }
};

const getMonHocById = async (id) => {
    try {
        const monHoc = await db.MonHoc.findOne({
            where: { monhoc_id: id, isDeleted: false },
            include: [
                { model: db.Khoa, as: 'Khoa', attributes: ['ten_khoa'] },
                {
                    model: db.BoMon,
                    as: 'BoMon',
                    attributes: [
                        'bomon_id',
                        ['bomon_id', 'chuyennganh_id'],
                        ['ma_bomon', 'ma_chuyennganh'],
                        ['ten_bomon', 'ten_chuyennganh'],
                        'khoa_id'
                    ]
                }
            ]
        });
        
        if (!monHoc) {
            return { success: false, message: 'Không tìm thấy môn học' };
        }
        return { success: true, data: monHoc };
    } catch (error) {
        throw error;
    }
};

const createMonHoc = async (payload) => {
    try {
        const normalizedPayload = await normalizeBoMonPayload(payload);

        const existing = await db.MonHoc.findOne({
            where: { 
                ma_mon: normalizedPayload.ma_mon,
                isDeleted: false 
            }
        });

        if (existing) {
            return { success: false, message: 'Mã môn học đã tồn tại' };
        }

        const newMonHoc = await db.MonHoc.create({
            ...normalizedPayload,
            isDeleted: false
        });

        return { success: true, data: newMonHoc, message: 'Thêm mới thành công' };
    } catch (error) {
        if (error.message === 'Bộ môn không tồn tại hoặc đã bị xóa') {
            return { success: false, message: error.message };
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
             return { success: false, message: 'Mã môn học đã tồn tại trong hệ thống (bao gồm cả dữ liệu cũ).' };
        }
        throw error;
    }
};

const updateMonHoc = async (id, payload) => {
    try {
        const monHoc = await db.MonHoc.findOne({ where: { monhoc_id: id, isDeleted: false } });
        if (!monHoc) {
            return { success: false, message: 'Không tìm thấy môn học' };
        }

        const normalizedPayload = await normalizeBoMonPayload(payload);

        if (normalizedPayload.ma_mon && normalizedPayload.ma_mon !== monHoc.ma_mon) {
            const checkDuplicate = await db.MonHoc.findOne({
                where: { 
                    ma_mon: normalizedPayload.ma_mon, 
                    monhoc_id: { [Op.ne]: id }, 
                    isDeleted: false
                }
            });
            if (checkDuplicate) {
                return { success: false, message: 'Mã môn học mới bị trùng với môn khác' };
            }
        }

        await monHoc.update(normalizedPayload);
        return { success: true, data: monHoc, message: 'Cập nhật thành công' };
    } catch (error) {
        if (error.message === 'Bộ môn không tồn tại hoặc đã bị xóa') {
            return { success: false, message: error.message };
        }
        throw error;
    }
};

const deleteMonHoc = async (id) => {
    try {
        const monHoc = await db.MonHoc.findOne({ where: { monhoc_id: id, isDeleted: false } });
        if (!monHoc) {
            return { success: false, message: 'Không tìm thấy môn học hoặc đã bị xóa' };
        }
        await monHoc.update({
            isDeleted: true,
        });

        return { success: true, message: 'Xóa môn học thành công' };
    } catch (error) {
        throw error;
    }
};

const bulkAssignKhoa = async (khoaId, monHocIds) => {
    try {
        if (!Array.isArray(monHocIds) || monHocIds.length === 0) {
            return { success: false, message: 'Danh sách môn học không được để trống' };
        }

        if (khoaId) {
            const khoa = await db.Khoa.findOne({
                where: { khoa_id: khoaId, isDeleted: false }
            });
            if (!khoa) {
                return { success: false, message: 'Khoa được chọn không tồn tại' };
            }
        }

        await db.MonHoc.update(
            { khoa_id: khoaId || null },
            {
                where: {
                    monhoc_id: { [Op.in]: monHocIds },
                    isDeleted: false
                }
            }
        );

        return { success: true, message: `Đã cập nhật khoa thành công cho ${monHocIds.length} môn học.` };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllMonHoc,
    getMonHocById,
    createMonHoc,
    updateMonHoc,
    deleteMonHoc,
    bulkAssignKhoa
};