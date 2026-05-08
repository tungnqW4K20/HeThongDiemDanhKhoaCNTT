'use strict';
const { Op } = require('sequelize');
const db = require('../models');

const getPhanCongTheoHocKy = async (giangvien_id, hocky_id) => {
  try {
    const monHocs = await db.MonHoc.findAll({
      attributes: ['monhoc_id', 'ten_mon', 'ma_mon', 'sotinchi'],

      include: [{
        model: db.PhanCongMon,
        attributes: [], 
        where: {
          giangvien_id,
          hocky_id
        },
        required: true 
      }],

      order: [['ten_mon', 'ASC']]
    }); 

    return monHocs;
  } catch (error) {
    console.error('Lỗi khi truy vấn môn học được phân công:', error);
    throw new Error(`Lỗi truy vấn môn học được phân công: ${error.message}`);
  }
};


const getGiangVienByMaKhoa = async (maKhoa, target_chuyennganh_id = null) => {
    try {
        if (!maKhoa) {
            return { errCode: 1, message: 'Vui lòng cung cấp mã khoa (ma_khoa)!' };
        }

        let scopedGiangVienIds = null;
        if (target_chuyennganh_id) {
            const lopHocPhan = await db.LopHocPhan.findAll({
                attributes: ['giangvien_id'],
                where: { giangvien_id: { [Op.ne]: null } },
                include: [{
                    model: db.MonHoc,
                    attributes: [],
                    required: true,
                    where: {
                        [Op.or]: [
                            { bomon_id: target_chuyennganh_id },
                            { chuyennganh_id: target_chuyennganh_id }
                        ]
                    }
                }]
            });

            scopedGiangVienIds = [...new Set(lopHocPhan.map((row) => row.giangvien_id).filter(Boolean))];
            if (scopedGiangVienIds.length === 0) {
                return { errCode: 0, message: 'OK', data: [] };
            }
        }

        const data = await db.GiangVien.findAll({
            // 1. Chỉ lấy giảng viên chưa bị xóa
            where: { 
                isDeleted: false,
                ...(scopedGiangVienIds ? { giangvien_id: { [Op.in]: scopedGiangVienIds } } : {})
            },
            attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten', 'email', 'sdt'], // Chỉ lấy các trường cần thiết
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa', // Phải khớp với alias trong model GiangVien
                    attributes: ['ten_khoa', 'ma_khoa'],
                    where: { 
                        ma_khoa: maKhoa, // 2. Lọc theo mã khoa truyền vào
                        isDeleted: false // Đảm bảo khoa đó cũng chưa bị xóa
                    }
                }
            ],
            raw: false,
            nest: true
        });

        if (data && data.length > 0) {
            return { errCode: 0, message: 'OK', data: data };
        } else {
            return { errCode: 0, message: 'Không tìm thấy giảng viên nào hoặc mã khoa không đúng.', data: [] };
        }

    } catch (error) {
        console.error(error);
        throw error;
    }
};

const getAllGiangVienService = async (target_khoa_id = null, target_chuyennganh_id = null) => {
    try {
        let whereCondition = { isDeleted: false };
        
        // Nếu có truyền khoa_id (từ lãnh đạo/trưởng bộ môn), thêm vào điều kiện lọc
        if (target_khoa_id && !target_chuyennganh_id) {
            whereCondition.khoa_id = target_khoa_id;
        }

        if (target_chuyennganh_id) {
            const lopHocPhan = await db.LopHocPhan.findAll({
                attributes: ['giangvien_id'],
                where: { giangvien_id: { [Op.ne]: null } },
                include: [{
                    model: db.MonHoc,
                    attributes: [],
                    required: true,
                    where: {
                        [Op.or]: [
                            { bomon_id: target_chuyennganh_id },
                            { chuyennganh_id: target_chuyennganh_id }
                        ]
                    }
                }]
            });

            const idList = [...new Set(lopHocPhan.map((item) => item.giangvien_id).filter(Boolean))];
            if (idList.length === 0) {
                return { errCode: 0, message: 'OK', data: [] };
            }

            whereCondition.giangvien_id = { [Op.in]: idList };

            if (target_khoa_id) {
                whereCondition[Op.or] = [
                    { khoa_id: target_khoa_id },
                    { khoa_id: null }
                ];
            }
        }

        const data = await db.GiangVien.findAll({
            attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten', 'email', 'sdt', 'khoa_id'],
            where: whereCondition,
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa', 
                    attributes: ['ten_khoa', 'ma_khoa']
                },
                {
                    model: db.TaiKhoan,
                    as: 'TaiKhoan',
                    required: false,
                    attributes: ['taikhoan_id', 'username', 'vaitro', 'ref_id'],
                    include: [
                        {
                            model: db.BoMon,
                            as: 'DanhSachBoMonQuanLy',
                            attributes: ['bomon_id', 'ten_bomon']
                        }
                    ]
                },
                {
                    model: db.BoMon,
                    as: 'DanhSachBoMon',
                    attributes: ['bomon_id', 'ten_bomon', 'ma_bomon'],
                    through: { attributes: [] }
                }
            ],
            raw: false, 
            nest: true  
        });

        return { errCode: 0, message: 'OK', data: data };
    } catch (error) {
        console.error("Service Error:", error);
        return { errCode: 1, message: 'Lỗi truy vấn cơ sở dữ liệu' };
    }
}

// 1. Tạo mới giảng viên
const createGiangVien = async (data) => {
    try {
        // Check duplicate ma_gv
        const checkExist = await db.GiangVien.findOne({ where: { ma_gv: data.ma_gv } });
        if (checkExist) {
            return { errCode: 1, message: 'Mã giảng viên đã tồn tại!' };
        }

        const transaction = await db.sequelize.transaction();
        try {
            const newGV = await db.GiangVien.create({
                ma_gv: data.ma_gv,
                ho: data.ho,
                ten: data.ten,
                email: data.email,
                sdt: data.sdt,
                khoa_id: data.khoa_id,
                isDeleted: false
            }, { transaction });

            if (data.bomon_ids && Array.isArray(data.bomon_ids) && data.bomon_ids.length > 0) {
                const boMonData = data.bomon_ids.map(id => ({
                    giangvien_id: newGV.giangvien_id,
                    bomon_id: id
                }));
                await db.GiangVien_BoMon.bulkCreate(boMonData, { transaction });
            }

            await transaction.commit();
            return { errCode: 0, message: 'Tạo giảng viên thành công', data: newGV };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error(error);
        return { errCode: -1, message: 'Lỗi server khi tạo giảng viên' };
    }
};

// 2. Lấy chi tiết 1 giảng viên
const getGiangVienById = async (giangvien_id) => {
    try {
        const gv = await db.GiangVien.findOne({
            where: { giangvien_id: giangvien_id, isDeleted: false },
            include: [
                { model: db.Khoa, as: 'Khoa', attributes: ['khoa_id', 'ten_khoa', 'ma_khoa'] },
                {
                    model: db.TaiKhoan,
                    as: 'TaiKhoan',
                    required: false,
                    attributes: ['taikhoan_id', 'username', 'vaitro', 'ref_id'],
                    include: [
                        {
                            model: db.BoMon,
                            as: 'DanhSachBoMonQuanLy',
                            attributes: ['bomon_id', 'ten_bomon']
                        }
                    ]
                },
                {
                    model: db.BoMon,
                    as: 'DanhSachBoMon',
                    attributes: ['bomon_id', 'ten_bomon', 'ma_bomon'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!gv) return { errCode: 2, message: 'Không tìm thấy giảng viên' };

        return { errCode: 0, message: 'OK', data: gv };
    } catch (error) {
        return { errCode: -1, message: 'Lỗi server' };
    }
};

// 3. Cập nhật giảng viên
const updateGiangVien = async (data) => {
    try {
        if (!data.giangvien_id) return { errCode: 1, message: 'Thiếu ID giảng viên!' };

        const gv = await db.GiangVien.findOne({
            where: { giangvien_id: data.giangvien_id, isDeleted: false }
        });

        if (!gv) return { errCode: 2, message: 'Giảng viên không tồn tại' };

        const transaction = await db.sequelize.transaction();
        try {
            // Cập nhật thông tin
            gv.ho = data.ho;
            gv.ten = data.ten;
            gv.email = data.email;
            gv.sdt = data.sdt;
            gv.khoa_id = data.khoa_id; 
            
            await gv.save({ transaction });

            if (data.bomon_ids && Array.isArray(data.bomon_ids)) {
                // Delete existing associations
                await db.GiangVien_BoMon.destroy({ where: { giangvien_id: gv.giangvien_id }, transaction });
                
                if (data.bomon_ids.length > 0) {
                    const boMonData = data.bomon_ids.map(id => ({
                        giangvien_id: gv.giangvien_id,
                        bomon_id: id
                    }));
                    await db.GiangVien_BoMon.bulkCreate(boMonData, { transaction });
                }
            }

            await transaction.commit();
            return { errCode: 0, message: 'Cập nhật thành công', data: gv };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error(error);
        return { errCode: -1, message: 'Lỗi server khi cập nhật' };
    }
};

// 4. Xóa giảng viên (Soft Delete)
const deleteGiangVien = async (giangvien_id) => {
    try {
        const gv = await db.GiangVien.findOne({
            where: { giangvien_id: giangvien_id }
        });

        if (!gv) return { errCode: 2, message: 'Giảng viên không tồn tại' };

        // Soft delete: set isDeleted = true
        gv.isDeleted = true;
        await gv.save();

        return { errCode: 0, message: 'Xóa giảng viên thành công' };
    } catch (error) {
        console.error(error);
        return { errCode: -1, message: 'Lỗi server khi xóa' };
    }
};



const getThongTinGiangVien = async (giangvien_id) => {
  try {
    const giangVien = await db.GiangVien.findOne({
      where: { giangvien_id },
      attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten', 'email', 'sdt'],
      include: [
        {
          model: db.Khoa,
          as: 'Khoa',
          attributes: ['ten_khoa', 'ma_khoa']
        },
        {
          model: db.BoMon,
          as: 'DanhSachBoMon',
          attributes: ['bomon_id', 'ten_bomon', 'ma_bomon'],
          through: { attributes: [] }
        }
      ]
    });

    if (!giangVien) {
      throw new Error('Không tìm thấy giảng viên');
    }

    return giangVien;
  } catch (error) {
    throw error;
  }
};


module.exports = {
    getPhanCongTheoHocKy, 
    getGiangVienByMaKhoa,
    getAllGiangVienService,
    createGiangVien,
    getGiangVienById,
    updateGiangVien,
    deleteGiangVien,
    getThongTinGiangVien
};