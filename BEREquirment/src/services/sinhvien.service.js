'use strict';
const db = require('../models');

const { LopHanhChinh, GiangVien, SinhVien } = db;

// const getSinhVienByLop = async (lop_hanhchinh_id) => {
//     try {
//         return await db.SinhVien.findAll({
//             where: {
//                 lop_hanhchinh_id,
//                 isDeleted: false
//             },
//             order: [['ten', 'ASC']]
//         });
//     } catch (err) {
//         throw new Error('Lỗi lấy danh sách sinh viên: ' + err.message);
//     }
// };

const getSinhVienByLop = async (lop_hanhchinh_id) => {
    try {
        // Truy vấn lớp hành chính và "vét" toàn bộ thông tin liên quan qua Alias
        const classData = await LopHanhChinh.findOne({
            where: { 
                lop_hanhchinh_id,
                isDeleted: false 
            },
            attributes: ['lop_hanhchinh_id', 'ten_lop', 'nien_khoa', 'chuong_trinh'],
            include: [
                {
                    model: GiangVien,
                    as: 'GVCN', // Khớp với alias trong Model bạn gửi
                    attributes: ['giangvien_id', 'ho', 'ten', 'sdt', 'email'] // Lấy thêm SDT
                },
                {
                    model: SinhVien,
                    as: 'DanhSachSinhVien', // Khớp với alias trong Model bạn gửi
                    where: { isDeleted: false },
                    attributes: ['sinhvien_id', 'ma_sv', 'ten', 'ngaysinh', 'email', 'sdt'],
                    required: false // Trả về thông tin lớp ngay cả khi chưa có sinh viên nào
                }
            ],
            // Sắp xếp danh sách sinh viên theo tên từ A-Z
            order: [
                [{ model: SinhVien, as: 'DanhSachSinhVien' }, 'ten', 'ASC']
            ]
        });

        if (!classData) {
            throw new Error('Không tìm thấy lớp hành chính hoặc lớp đã bị xóa.');
        }

        return classData;
    } catch (err) {
        throw new Error(err.message);
    }
};


const createSinhVien = async (data) => {
    try {
        return await db.SinhVien.create({
            ma_sv: data.ma_sv,
            ten: data.ten,
            email: data.email,
            sdt: data.sdt,
            lop_hanhchinh_id: data.lop_hanhchinh_id,
            ngaysinh: data.ngaysinh,
            trang_thai: data.trang_thai || "Đang học"
        });
    } catch (err) {
        throw new Error('Lỗi thêm sinh viên: ' + err.message);
    }
};

const updateSinhVien = async (sinhvien_id, data) => {
    try {
        const sv = await db.SinhVien.findByPk(sinhvien_id);
        if (!sv) throw new Error('Không tìm thấy sinh viên');

        await sv.update(data);
        return sv;
    } catch (err) {
        throw new Error('Lỗi cập nhật sinh viên: ' + err.message);
    }
};

const softDeleteSinhVien = async (sinhvien_id) => {
    try {
        const sv = await db.SinhVien.findByPk(sinhvien_id);
        if (!sv) throw new Error('Không tìm thấy sinh viên');

        await sv.update({ isDeleted: true });
        return sv;
    } catch (err) {
        throw new Error('Lỗi xóa mềm sinh viên: ' + err.message);
    }
};

module.exports = {
    getSinhVienByLop,
    createSinhVien,
    updateSinhVien,
    softDeleteSinhVien
};
