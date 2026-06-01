'use strict';
const db = require('../models');

const { LopHanhChinh, GiangVien, SinhVien } = db;

const normalizeText = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .trim()
        .toLowerCase();

const statusAliasMap = {
    dang_hoc: ['dang hoc', 'đang học'],
    canh_bao: ['canh bao', 'cảnh báo'],
    bao_luu: ['bao luu', 'bảo lưu'],
    thoi_hoc: ['thoi hoc', 'thôi học']
};

const parseEnumValues = (enumType = '') => {
    // enum('A','B','C') => ['A','B','C']
    const matched = enumType.match(/^enum\((.*)\)$/i);
    if (!matched || !matched[1]) return [];
    return matched[1]
        .split(',')
        .map((item) => item.trim().replace(/^'/, '').replace(/'$/, '').replace(/\\'/g, "'"));
};

const getTrangThaiEnumValues = async () => {
    const [rows] = await db.sequelize.query("SHOW COLUMNS FROM `sinhvien` LIKE 'trang_thai'");
    const enumType = rows?.[0]?.Type || '';
    return parseEnumValues(enumType);
};

const resolveTrangThaiByDbEnum = async (inputStatus) => {
    if (inputStatus === undefined) return undefined;
    if (inputStatus === null || String(inputStatus).trim() === '') return null;

    const dbEnumValues = await getTrangThaiEnumValues();
    if (!dbEnumValues.length) return String(inputStatus).trim();

    const normalizedInput = normalizeText(inputStatus);

    let targetKey = null;
    Object.entries(statusAliasMap).forEach(([key, aliases]) => {
        if (aliases.includes(normalizedInput)) targetKey = key;
    });

    if (!targetKey) {
        const direct = dbEnumValues.find((val) => normalizeText(val) === normalizedInput);
        return direct || null;
    }

    const matchedDbValue = dbEnumValues.find((val) => {
        const normalizedVal = normalizeText(val);
        return statusAliasMap[targetKey].includes(normalizedVal);
    });

    return matchedDbValue || null;
};

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
                    attributes: ['sinhvien_id', 'ma_sv', 'ten', 'ngaysinh', 'email', 'sdt', 'trang_thai', 'lop_hanhchinh_id'],
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
        const maSv = String(data.ma_sv || '').trim();
        if (!maSv) {
            throw new Error('Mã sinh viên không được để trống');
        }

        const existed = await db.SinhVien.findOne({
            where: { ma_sv: maSv }
        });

        if (existed) {
            throw new Error('Trùng mã sinh viên');
        }

        const trangThaiResolved = await resolveTrangThaiByDbEnum(data.trang_thai || 'Đang học');
        return await db.SinhVien.create({
            ma_sv: maSv,
            ten: data.ten,
            email: data.email,
            sdt: data.sdt,
            lop_hanhchinh_id: data.lop_hanhchinh_id,
            ngaysinh: data.ngaysinh,
            trang_thai: trangThaiResolved
        });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') {
            throw new Error('Trùng mã sinh viên');
        }
        throw new Error('Lỗi thêm sinh viên: ' + err.message);
    }
};

const updateSinhVien = async (sinhvien_id, data) => {
    try {
        const sv = await db.SinhVien.findByPk(sinhvien_id);
        if (!sv) throw new Error('Không tìm thấy sinh viên');

        const payload = {};
        if (Object.prototype.hasOwnProperty.call(data, 'ten')) payload.ten = data.ten;
        if (Object.prototype.hasOwnProperty.call(data, 'email')) payload.email = data.email;
        if (Object.prototype.hasOwnProperty.call(data, 'sdt')) payload.sdt = data.sdt;
        if (Object.prototype.hasOwnProperty.call(data, 'ngaysinh')) payload.ngaysinh = data.ngaysinh;
        if (Object.prototype.hasOwnProperty.call(data, 'lop_hanhchinh_id') && data.lop_hanhchinh_id) {
            payload.lop_hanhchinh_id = data.lop_hanhchinh_id;
        }

        if (Object.prototype.hasOwnProperty.call(data, 'trang_thai')) {
            const trangThaiResolved = await resolveTrangThaiByDbEnum(data.trang_thai);
            if (data.trang_thai && trangThaiResolved === null) {
                throw new Error('Trạng thái không hợp lệ');
            }
            payload.trang_thai = trangThaiResolved;
        }

        await sv.update(payload);
        return sv;
    } catch (err) {
        throw new Error('Lỗi cập nhật sinh viên: ' + err.message);
    }
};

const hardDeleteSinhVien = async (sinhvien_id) => {
    const transaction = await db.sequelize.transaction();
    try {
        const sv = await db.SinhVien.findByPk(sinhvien_id, { transaction });
        if (!sv) throw new Error('Không tìm thấy sinh viên');

        // Xóa các bản ghi liên quan trước để tránh lỗi khóa ngoại.
        await db.DiemDanh.destroy({
            where: { sinhvien_id },
            transaction
        });

        await db.DangKyHoc.destroy({
            where: { sinhvien_id },
            transaction
        });

        await sv.destroy({ transaction });

        await transaction.commit();
        return true;
    } catch (err) {
        await transaction.rollback();
        throw new Error('Lỗi xóa sinh viên: ' + err.message);
    }
};

const getAllSinhVien = async () => {
    try {
        return await db.SinhVien.findAll({
            where: { isDeleted: false },
            attributes: ['sinhvien_id', 'ma_sv', 'ten', 'email'],
            order: [['ten', 'ASC']]
        });
    } catch (err) {
        throw new Error('Lỗi lấy tất cả sinh viên: ' + err.message);
    }
};

module.exports = {
    getSinhVienByLop,
    createSinhVien,
    updateSinhVien,
    hardDeleteSinhVien,
    getAllSinhVien
};
