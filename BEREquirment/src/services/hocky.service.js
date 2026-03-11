'use strict';
const db = require('../models');

const getAllHocKy = async () => {
    try {
        const result = await db.HocKy.findAll({
            attributes: [
                'hocky_id', 
                'ten_hocky', 
                'ngay_batdau', 
                'ngay_ketthuc',
                'ngay_monday_tuan_1',
                'tuan_bat_dau_co_lich',
                'namhoc_id'
            ],
            include: [
                {
                    model: db.NamHoc,
                    as: 'NamHoc', // Alias này phải khớp với khai báo trong model HocKy.associate
                    attributes: [
                        'namhoc_id', 
                        'ten_namhoc', 
                        'ngay_batdau', 
                        'ngay_ketthuc'
                    ]
                }
            ],
            order: [
                ['ngay_batdau', 'DESC'], // Học kỳ mới nhất lên đầu
                [{ model: db.NamHoc, as: 'NamHoc' }, 'ngay_batdau', 'DESC'] // Sắp xếp theo năm học nếu cần
            ]
        });
        return result;
    } catch (error) {
        console.error("Lỗi tại getAllHocKy Service:", error);
        throw error;
    }
};

const createHocKy = async (data) => {
    try {
        const { ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1, namhoc_id } = data;

        const namhoc = await db.NamHoc.findByPk(namhoc_id);
        if (!namhoc) throw new Error("Năm học được chọn không tồn tại.");

        if (new Date(ngay_batdau) < new Date(namhoc.ngay_batdau) || 
            new Date(ngay_ketthuc) > new Date(namhoc.ngay_ketthuc)) {
            throw new Error(`Ngày học kỳ phải nằm trong phạm vi năm học (${namhoc.ngay_batdau} đến ${namhoc.ngay_ketthuc})`);
        }

        // Lưu trực tiếp các giá trị được chỉ định từ Frontend/Postman
        const newHocKy = await db.HocKy.create({
            ten_hocky,
            ngay_batdau,
            ngay_ketthuc,
            ngay_monday_tuan_1,
            namhoc_id,
            tuan_bat_dau_co_lich: data.tuan_bat_dau_co_lich || null
        });
        return newHocKy;
    } catch (error) {
        throw new Error("Lỗi khi tạo học kỳ: " + error.message);
    }
};

const updateHocKy = async (id, data) => {
    try {
        const hocky = await db.HocKy.findByPk(id);
        if (!hocky) throw new Error("Học kỳ không tồn tại");

        const { ten_hocky, ngay_batdau, ngay_ketthuc, ngay_monday_tuan_1 } = data;

        await hocky.update({
            ten_hocky,
            ngay_batdau,
            ngay_ketthuc,
            ngay_monday_tuan_1,
            tuan_bat_dau_co_lich: data.tuan_bat_dau_co_lich !== undefined ? data.tuan_bat_dau_co_lich : hocky.tuan_bat_dau_co_lich
        });
        return hocky;
    } catch (error) {
        throw new Error("Lỗi khi cập nhật học kỳ: " + error.message);
    }
};

const deleteHocKy = async (id) => {
    try {
        const hocky = await db.HocKy.findByPk(id);
        if (!hocky) throw new Error("Học kỳ không tồn tại");

        // Chặn xóa nếu đã có dữ liệu phân công giảng dạy (Data Integrity)
        const hasLHP = await db.LopHocPhan.findOne({ where: { hocky_id: id } });
        if (hasLHP) {
            throw new Error("Không thể xóa học kỳ này vì đã có dữ liệu phân công giảng dạy liên quan.");
        }

        await hocky.destroy();
        return true;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllHocKy,
    createHocKy,
    updateHocKy,
    deleteHocKy
};