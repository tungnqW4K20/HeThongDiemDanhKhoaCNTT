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
        attributes: ['bomon_id', 'khoa_id']
    });

    if (!boMon) {
        throw new Error('Bộ môn không tồn tại hoặc đã bị xóa');
    }

    normalized.bomon_id = boMon.bomon_id;
    // Giữ tương thích tạm thời với các logic cũ đang đọc chuyennganh_id.
    normalized.chuyennganh_id = boMon.bomon_id;
    if (!normalized.khoa_id) {
        normalized.khoa_id = boMon.khoa_id;
    }

    return normalized;
};

const getAllMonHoc = async (query) => {
    try {
        const whereClause = { isDeleted: false };
        if (query.search) {
            whereClause[Op.or] = [
                { ma_mon: { [Op.like]: `%${query.search}%` } },
                { ten_mon: { [Op.like]: `%${query.search}%` } }
            ];
        }

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

module.exports = {
    getAllMonHoc,
    getMonHocById,
    createMonHoc,
    updateMonHoc,
    deleteMonHoc
};