const db = require('../models'); 
const { Op } = require('sequelize');

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
            include: [{ model: db.Khoa, as: 'Khoa', attributes: ['ten_khoa'] }]
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
        const existing = await db.MonHoc.findOne({
            where: { 
                ma_mon: payload.ma_mon,
                isDeleted: false 
            }
        });

        if (existing) {
            return { success: false, message: 'Mã môn học đã tồn tại' };
        }

        const newMonHoc = await db.MonHoc.create({
            ...payload,
            isDeleted: false
        });

        return { success: true, data: newMonHoc, message: 'Thêm mới thành công' };
    } catch (error) {
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

        if (payload.ma_mon && payload.ma_mon !== monHoc.ma_mon) {
            const checkDuplicate = await db.MonHoc.findOne({
                where: { 
                    ma_mon: payload.ma_mon, 
                    monhoc_id: { [Op.ne]: id }, 
                    isDeleted: false
                }
            });
            if (checkDuplicate) {
                return { success: false, message: 'Mã môn học mới bị trùng với môn khác' };
            }
        }

        await monHoc.update(payload);
        return { success: true, data: monHoc, message: 'Cập nhật thành công' };
    } catch (error) {
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