const db = require('../models/index'); 

const getAllKhoa = async () => {
    try {
        const data = await db.Khoa.findAll({
            attributes: ['khoa_id', 'ma_khoa', 'ten_khoa', 'mota'],
            include: [
                // 1. Lấy danh sách Lớp hành chính (Code cũ của bạn)
                {
                    model: db.LopHanhChinh,
                    as: 'DanhSachLopHanhChinh', 
                    attributes: ['lop_hanhchinh_id', 'ten_lop', 'nien_khoa']
                },
                // 2. --- MỚI THÊM: Lấy luôn danh sách Chuyên Ngành ---
                {
                    model: db.ChuyenNganh,
                    as: 'DanhSachChuyenNganh', // Phải trùng với "as" trong file models/Khoa.js
                    attributes: ['chuyennganh_id', 'ten_chuyennganh', 'ma_chuyennganh']
                }
            ],
            order: [
                ['ten_khoa', 'ASC'], // Sắp xếp khoa A-Z
                // Sắp xếp chuyên ngành bên trong khoa A-Z
                [{ model: db.ChuyenNganh, as: 'DanhSachChuyenNganh' }, 'ten_chuyennganh', 'ASC'] 
            ],
            raw: false, 
            nest: true
        });
        return {
            errCode: 0,
            message: 'OK',
            data: data
        };
    } catch (error) {
        throw error;
    }
};
const getKhoaById = async (khoaId) => {
    try {
        if (!khoaId) {
            return { errCode: 1, message: 'Missing required parameter!' };
        }
        const khoa = await db.Khoa.findOne({
            where: { khoa_id: khoaId },
            include: [
                {
                    model: db.LopHanhChinh,
                    as: 'DanhSachLopHanhChinh',
                    attributes: ['lop_hanhchinh_id', 'ten_lop', 'nien_khoa']
                }
            ],
            raw: false,
            nest: true
        });

        if (khoa) {
            return { errCode: 0, message: 'OK', data: khoa };
        } else {
            return { errCode: 2, message: 'Khoa not found!' };
        }
    } catch (error) {
        throw error;
    }
};

const createKhoa = async (data) => {
    try {
        const checkExist = await db.Khoa.findOne({
            where: { ma_khoa: data.ma_khoa }
        });

        if (checkExist) {
            return { errCode: 1, message: 'Mã khoa đã tồn tại!' };
        }

        await db.Khoa.create({
            ma_khoa: data.ma_khoa,
            ten_khoa: data.ten_khoa,
            mota: data.mota
        });

        return { errCode: 0, message: 'Tạo khoa thành công!' };
    } catch (error) {
        throw error;
    }
};

const updateKhoa = async (data) => {
    try {
        if (!data.khoa_id) {
            return { errCode: 2, message: 'Missing required parameter: khoa_id' };
        }

        const khoa = await db.Khoa.findOne({
            where: { khoa_id: data.khoa_id },
            raw: false
        });

        if (khoa) {
            khoa.ten_khoa = data.ten_khoa;
            khoa.ma_khoa = data.ma_khoa;
            khoa.mota = data.mota;
            
            await khoa.save(); 
            return { errCode: 0, message: 'Cập nhật khoa thành công!' };
        } else {
            return { errCode: 1, message: 'Khoa không tồn tại!' };
        }
    } catch (error) {
        throw error;
    }
};

const deleteKhoa = async (khoaId) => {
    try {
        const khoa = await db.Khoa.findOne({
            where: { 
                khoa_id: khoaId,
                isDeleted: false 
            }
        });

        if (!khoa) {
            return { 
                errCode: 2, 
                message: 'Khoa không tồn tại hoặc đã bị xóa trước đó!' 
            };
        }

        await db.Khoa.update(
            { isDeleted: true }, 
            { 
                where: { khoa_id: khoaId } 
            }
        );

        return { errCode: 0, message: 'Xóa mềm khoa thành công!' };
    } catch (error) {
        console.error("Lỗi xóa mềm khoa:", error);
        throw error;
    }
};

module.exports = {
    getAllKhoa,
    getKhoaById,
    createKhoa,
    updateKhoa,
    deleteKhoa
};

