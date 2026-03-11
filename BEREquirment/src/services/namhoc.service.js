'use strict';
const db = require('../models');

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

    // Logic: Ngày bắt đầu < Ngày kết thúc
    if (new Date(ngay_batdau) >= new Date(ngay_ketthuc)) {
        throw new Error("Ngày bắt đầu phải nhỏ hơn ngày kết thúc.");
    }

    return await db.NamHoc.create({
        ten_namhoc,
        ngay_batdau,
        ngay_ketthuc
    });
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