'use strict';
const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const getAllTaiKhoan = async () => {
    try {
        const accounts = await db.TaiKhoan.findAll({
            include: [
                {
                    model: db.GiangVien,
                    as: 'GiangVien',
                    attributes: ['ma_gv', 'ho', 'ten', 'email']
                },
                {
                    model: db.BoMon,
                    as: 'DanhSachBoMonQuanLy',
                    attributes: ['bomon_id', 'ten_bomon']
                }
            ],
            order: [['ngay_tao', 'DESC']]
        });
        return {
            errCode: 0,
            message: 'Lấy danh sách tài khoản thành công',
            data: accounts
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi lấy danh sách tài khoản'
        };
    }
};

const createTaiKhoan = async (data) => {
    try {
        if (!data.username || !data.password || !data.vaitro) {
            return {
                errCode: 1,
                message: 'Thiếu thông tin bắt buộc (username, password, vaitro)'
            };
        }

        // Kiểm tra username tồn tại
        const existing = await db.TaiKhoan.findOne({ where: { username: data.username } });
        if (existing) {
            return {
                errCode: 2,
                message: 'Tên đăng nhập đã tồn tại'
            };
        }

        // Hash mật khẩu
        const salt = bcrypt.genSaltSync(10);
        const password_hash = bcrypt.hashSync(data.password, salt);

        const newAccount = await db.TaiKhoan.create({
            username: data.username,
            password_hash: password_hash,
            vaitro: data.vaitro,
            ref_id: data.ref_id || null
        });

        // Nếu là trưởng bộ môn, cập nhật bảng BoMon
        if (data.vaitro === 'truongbomon' && data.managed_bomon_ids && Array.isArray(data.managed_bomon_ids)) {
            await db.BoMon.update(
                { truong_bomon_id: newAccount.taikhoan_id },
                { where: { bomon_id: { [Op.in]: data.managed_bomon_ids } } }
            );
        }

        return {
            errCode: 0,
            message: 'Tạo tài khoản thành công',
            data: newAccount
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi tạo tài khoản'
        };
    }
};

const updateTaiKhoan = async (id, data) => {
    try {
        const account = await db.TaiKhoan.findByPk(id);
        if (!account) {
            return {
                errCode: 1,
                message: 'Tài khoản không tồn tại'
            };
        }

        // Nếu có đổi username
        if (data.username && data.username !== account.username) {
            const existing = await db.TaiKhoan.findOne({ 
                where: { 
                    username: data.username,
                    taikhoan_id: { [Op.ne]: id } 
                } 
            });
            if (existing) {
                return {
                    errCode: 2,
                    message: 'Tên đăng nhập đã tồn tại'
                };
            }
            account.username = data.username;
        }

        // Cập nhật thông tin cơ bản
        if (data.vaitro) account.vaitro = data.vaitro;
        if (data.ref_id !== undefined) account.ref_id = data.ref_id;

        // Nếu có đổi mật khẩu
        if (data.password) {
            const salt = bcrypt.genSaltSync(10);
            account.password_hash = bcrypt.hashSync(data.password, salt);
        }

        await account.save();

        // Cập nhật quản lý bộ môn
        // BƯỚC 1: Xóa toàn bộ liên kết cũ của tài khoản này
        await db.BoMon.update(
            { truong_bomon_id: null },
            { where: { truong_bomon_id: id } }
        );

        // BƯỚC 2: Gán liên kết mới nếu là trưởng bộ môn
        if (data.vaitro === 'truongbomon' && data.managed_bomon_ids && Array.isArray(data.managed_bomon_ids)) {
            await db.BoMon.update(
                { truong_bomon_id: id },
                { where: { bomon_id: { [Op.in]: data.managed_bomon_ids } } }
            );
        }

        return {
            errCode: 0,
            message: 'Cập nhật tài khoản thành công',
            data: account
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi cập nhật tài khoản'
        };
    }
};

const deleteTaiKhoan = async (id) => {
    try {
        const account = await db.TaiKhoan.findByPk(id);
        if (!account) {
            return {
                errCode: 1,
                message: 'Tài khoản không tồn tại'
            };
        }

        // Không cho phép xóa chính mình (nếu cần logic này, admin hiện tại đang thực hiện)
        // Ở đây chỉ thực hiện xóa đơn thuần
        await account.destroy();

        return {
            errCode: 0,
            message: 'Xóa tài khoản thành công'
        };
    } catch (error) {
        console.error(error);
        return {
            errCode: -1,
            message: 'Lỗi server khi xóa tài khoản'
        };
    }
};

module.exports = {
    getAllTaiKhoan,
    createTaiKhoan,
    updateTaiKhoan,
    deleteTaiKhoan
};
