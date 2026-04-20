const db = require('../models/index'); 

const normalizeMonHocIds = (monHocIds) => {
    if (!Array.isArray(monHocIds)) return [];
    return [...new Set(monHocIds.filter(Boolean))];
};

const syncMonHocByBoMon = async ({ chuyenNganhId, khoaId, monHocIds }) => {
    const selectedIds = normalizeMonHocIds(monHocIds);

    const linkedChuyenNganh = chuyenNganhId
        ? await db.ChuyenNganh.findOne({
            where: { chuyennganh_id: chuyenNganhId, isDeleted: false },
            attributes: ['chuyennganh_id']
        })
        : null;
    const safeChuyenNganhId = linkedChuyenNganh ? linkedChuyenNganh.chuyennganh_id : null;

    const whereLinkedToBoMon = {
        isDeleted: false,
        [db.Sequelize.Op.or]: [
            { bomon_id: chuyenNganhId },
            { chuyennganh_id: chuyenNganhId }
        ]
    };

    if (selectedIds.length === 0) {
        await db.MonHoc.update(
            { bomon_id: null, chuyennganh_id: null },
            { where: whereLinkedToBoMon }
        );
        return;
    }

    const selectedMonHoc = await db.MonHoc.findAll({
        where: {
            monhoc_id: { [db.Sequelize.Op.in]: selectedIds },
            isDeleted: false
        },
        attributes: ['monhoc_id', 'khoa_id']
    });

    if (selectedMonHoc.length !== selectedIds.length) {
        throw new Error('Một số môn học đã chọn không tồn tại hoặc đã bị xóa.');
    }

    const notSameKhoa = selectedMonHoc.find((mh) => mh.khoa_id && khoaId && mh.khoa_id !== khoaId);
    if (notSameKhoa) {
        throw new Error('Môn học được chọn phải thuộc cùng khoa với bộ môn.');
    }

    await db.MonHoc.update(
        { bomon_id: null, chuyennganh_id: null },
        {
            where: {
                ...whereLinkedToBoMon,
                monhoc_id: { [db.Sequelize.Op.notIn]: selectedIds }
            }
        }
    );

    await db.MonHoc.update(
        { bomon_id: chuyenNganhId, chuyennganh_id: safeChuyenNganhId },
        {
            where: {
                monhoc_id: { [db.Sequelize.Op.in]: selectedIds },
                isDeleted: false
            }
        }
    );
};

const syncTruongBoMonRole = async ({ oldTruongBoMonId = null, newTruongBoMonId = null }) => {
    if (newTruongBoMonId) {
        await db.TaiKhoan.update(
            { vaitro: 'truongbomon' },
            {
                where: {
                    taikhoan_id: newTruongBoMonId,
                    vaitro: { [db.Sequelize.Op.in]: ['giangvien', 'truongbomon'] }
                }
            }
        );
    }

    if (oldTruongBoMonId && oldTruongBoMonId !== newTruongBoMonId) {
        const stillManagingBoMon = await db.BoMon.count({
            where: {
                truong_bomon_id: oldTruongBoMonId,
                isDeleted: false
            }
        });

        if (stillManagingBoMon === 0) {
            await db.TaiKhoan.update(
                { vaitro: 'giangvien' },
                {
                    where: {
                        taikhoan_id: oldTruongBoMonId,
                        vaitro: 'truongbomon'
                    }
                }
            );
        }
    }
};

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
                },
                {
                    model: db.ChuyenNganh,
                    as: 'DanhSachChuyenNganh',
                    attributes: ['chuyennganh_id', 'ten_chuyennganh', 'ma_chuyennganh']
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

const getAllBoMon = async (target_khoa_id = null, target_chuyennganh_id = null) => {
    try {
        const boMonWhere = { isDeleted: false };
        if (target_khoa_id) {
            boMonWhere.khoa_id = target_khoa_id;
        }
        if (target_chuyennganh_id) {
            boMonWhere.bomon_id = target_chuyennganh_id;
        }

        const data = await db.BoMon.findAll({
            where: boMonWhere,
            attributes: ['bomon_id', 'ma_bomon', 'ten_bomon', 'mota', 'khoa_id', 'truong_bomon_id'],
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa',
                    attributes: ['khoa_id', 'ma_khoa', 'ten_khoa']
                },
                {
                    model: db.MonHoc,
                    as: 'DanhSachMonHoc',
                    required: false,
                    where: { isDeleted: false },
                    attributes: ['monhoc_id', 'ma_mon', 'ten_mon']
                },
                {
                    model: db.TaiKhoan,
                    as: 'TruongBoMon',
                    required: false,
                    attributes: ['taikhoan_id', 'username', 'ref_id'],
                    include: [
                        {
                            model: db.GiangVien,
                            as: 'GiangVien',
                            required: false,
                            attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten']
                        }
                    ]
                }
            ],
            order: [
                ['ten_bomon', 'ASC'],
                [{ model: db.MonHoc, as: 'DanhSachMonHoc' }, 'ten_mon', 'ASC']
            ],
            raw: false,
            nest: true
        });

        const normalizedData = data.map((item) => {
            const json = item.toJSON();
            const monHocList = json.DanhSachMonHoc || [];
            return {
                ...json,
                chuyennganh_id: json.bomon_id,
                ma_chuyennganh: json.ma_bomon,
                ten_chuyennganh: json.ten_bomon,
                DanhSachMonHoc: monHocList,
                so_luong_mon_hoc: monHocList.length,
                TruongBoMon: json.TruongBoMon || null
            };
        });

        return {
            errCode: 0,
            message: 'OK',
            data: normalizedData
        };
    } catch (error) {
        throw error;
    }
};

const getAllBoMonRaw = async (target_khoa_id = null, target_bomon_id = null) => {
    try {
        const where = { isDeleted: false };
        if (target_khoa_id) {
            where.khoa_id = target_khoa_id;
        }
        if (target_bomon_id) {
            where.bomon_id = target_bomon_id;
        }

        const data = await db.BoMon.findAll({
            where,
            attributes: ['bomon_id', 'ma_bomon', 'ten_bomon', 'mota', 'khoa_id', 'truong_bomon_id'],
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa',
                    attributes: ['khoa_id', 'ma_khoa', 'ten_khoa']
                }
            ],
            order: [['ten_bomon', 'ASC']],
            raw: false,
            nest: true
        });

        return {
            errCode: 0,
            message: 'OK',
            data: data.map((item) => item.toJSON())
        };
    } catch (error) {
        throw error;
    }
};

const createBoMon = async (data) => {
    try {
        if (!data.khoa_id || !data.ma_chuyennganh || !data.ten_chuyennganh) {
            return { errCode: 1, message: 'Thiếu thông tin bắt buộc: khoa, mã bộ môn, tên bộ môn.' };
        }

        const khoa = await db.Khoa.findOne({ where: { khoa_id: data.khoa_id, isDeleted: false } });
        if (!khoa) {
            return { errCode: 2, message: 'Khoa không tồn tại.' };
        }

        const checkExist = await db.ChuyenNganh.findOne({
            where: { ma_chuyennganh: data.ma_chuyennganh.trim(), isDeleted: false }
        });

        if (checkExist) {
            return { errCode: 3, message: 'Mã bộ môn đã tồn tại!' };
        }

        const created = await db.ChuyenNganh.create({
            khoa_id: data.khoa_id,
            ma_chuyennganh: data.ma_chuyennganh.trim(),
            ten_chuyennganh: data.ten_chuyennganh.trim(),
            mota: data.mota || null,
            isDeleted: false
        });

        if (data.truong_bomon_id) {
            const candidate = await db.TaiKhoan.findOne({
                where: {
                    taikhoan_id: data.truong_bomon_id,
                    vaitro: { [db.Sequelize.Op.in]: ['giangvien', 'truongbomon'] }
                },
                include: [
                    {
                        model: db.GiangVien,
                        as: 'GiangVien',
                        required: false,
                        attributes: ['giangvien_id', 'khoa_id']
                    }
                ],
                attributes: ['taikhoan_id']
            });

            if (!candidate) {
                return { errCode: 6, message: 'Tài khoản trưởng bộ môn không hợp lệ.' };
            }

            if (candidate.GiangVien?.khoa_id && candidate.GiangVien.khoa_id !== data.khoa_id) {
                return { errCode: 7, message: 'Trưởng bộ môn phải thuộc cùng khoa với bộ môn.' };
            }
        }

        const [boMonEntity] = await db.BoMon.findOrCreate({
            where: { bomon_id: created.chuyennganh_id },
            defaults: {
                bomon_id: created.chuyennganh_id,
                khoa_id: data.khoa_id,
                ma_bomon: data.ma_chuyennganh.trim(),
                ten_bomon: data.ten_chuyennganh.trim(),
                truong_bomon_id: data.truong_bomon_id || null,
                mota: data.mota || null,
                isDeleted: false
            }
        });

        if (data.truong_bomon_id) {
            boMonEntity.truong_bomon_id = data.truong_bomon_id;
            await boMonEntity.save();
            await syncTruongBoMonRole({ newTruongBoMonId: data.truong_bomon_id });
        }

        if (Array.isArray(data.monhoc_ids)) {
            await syncMonHocByBoMon({
                chuyenNganhId: created.chuyennganh_id,
                khoaId: data.khoa_id,
                monHocIds: data.monhoc_ids
            });
        }

        return { errCode: 0, message: 'Tạo bộ môn thành công!' };
    } catch (error) {
        if (error.message === 'Một số môn học đã chọn không tồn tại hoặc đã bị xóa.' || error.message === 'Môn học được chọn phải thuộc cùng khoa với bộ môn.') {
            return { errCode: 8, message: error.message };
        }
        throw error;
    }
};

const updateBoMon = async (data) => {
    try {
        if (!data.chuyennganh_id) {
            return { errCode: 1, message: 'Thiếu chuyennganh_id.' };
        }
        if (!data.khoa_id || !data.ma_chuyennganh || !data.ten_chuyennganh) {
            return { errCode: 2, message: 'Thiếu thông tin bắt buộc: khoa, mã bộ môn, tên bộ môn.' };
        }

        const boMonEntity = await db.BoMon.findOne({
            where: { bomon_id: data.chuyennganh_id, isDeleted: false },
            raw: false
        });

        const linkedChuyenNganh = await db.ChuyenNganh.findOne({
            where: { chuyennganh_id: data.chuyennganh_id, isDeleted: false },
            raw: false
        });

        if (!boMonEntity && !linkedChuyenNganh) {
            return { errCode: 3, message: 'Bộ môn không tồn tại.' };
        }

        const khoa = await db.Khoa.findOne({ where: { khoa_id: data.khoa_id, isDeleted: false } });
        if (!khoa) {
            return { errCode: 4, message: 'Khoa không tồn tại.' };
        }

        if (data.truong_bomon_id) {
            const candidate = await db.TaiKhoan.findOne({
                where: { taikhoan_id: data.truong_bomon_id },
                include: [
                    {
                        model: db.GiangVien,
                        as: 'GiangVien',
                        required: false,
                        attributes: ['giangvien_id', 'khoa_id']
                    }
                ],
                attributes: ['taikhoan_id']
            });

            if (!candidate) {
                return { errCode: 6, message: 'Tài khoản trưởng bộ môn không hợp lệ.' };
            }

            if (candidate.GiangVien?.khoa_id && candidate.GiangVien.khoa_id !== data.khoa_id) {
                return { errCode: 7, message: 'Trưởng bộ môn phải thuộc cùng khoa với bộ môn.' };
            }
        }

        const dup = await db.BoMon.findOne({
            where: {
                ma_bomon: data.ma_chuyennganh.trim(),
                isDeleted: false,
                bomon_id: { [db.Sequelize.Op.ne]: data.chuyennganh_id }
            }
        });
        if (dup) {
            return { errCode: 5, message: 'Mã bộ môn đã tồn tại!' };
        }

        if (linkedChuyenNganh) {
            linkedChuyenNganh.khoa_id = data.khoa_id;
            linkedChuyenNganh.ma_chuyennganh = data.ma_chuyennganh.trim();
            linkedChuyenNganh.ten_chuyennganh = data.ten_chuyennganh.trim();
            linkedChuyenNganh.mota = data.mota || null;
            await linkedChuyenNganh.save();
        }

        const [boMonRecord] = await db.BoMon.findOrCreate({
            where: { bomon_id: data.chuyennganh_id },
            defaults: {
                bomon_id: data.chuyennganh_id,
                khoa_id: data.khoa_id,
                ma_bomon: data.ma_chuyennganh.trim(),
                ten_bomon: data.ten_chuyennganh.trim(),
                mota: data.mota || null,
                isDeleted: false
            }
        });

        const oldTruongBoMonId = boMonRecord.truong_bomon_id || null;

        boMonRecord.khoa_id = data.khoa_id;
        boMonRecord.ma_bomon = data.ma_chuyennganh.trim();
        boMonRecord.ten_bomon = data.ten_chuyennganh.trim();
        boMonRecord.truong_bomon_id = data.truong_bomon_id || null;
        boMonRecord.mota = data.mota || null;
        boMonRecord.isDeleted = false;
        await boMonRecord.save();

        await syncTruongBoMonRole({
            oldTruongBoMonId,
            newTruongBoMonId: data.truong_bomon_id || null
        });

        if (Array.isArray(data.monhoc_ids)) {
            await syncMonHocByBoMon({
                chuyenNganhId: data.chuyennganh_id,
                khoaId: data.khoa_id,
                monHocIds: data.monhoc_ids
            });
        }

        return { errCode: 0, message: 'Cập nhật bộ môn thành công!' };
    } catch (error) {
        if (error.message === 'Một số môn học đã chọn không tồn tại hoặc đã bị xóa.' || error.message === 'Môn học được chọn phải thuộc cùng khoa với bộ môn.') {
            return { errCode: 8, message: error.message };
        }
        throw error;
    }
};

const deleteBoMon = async (chuyenNganhId) => {
    try {
        const boMon = await db.BoMon.findOne({
            where: { bomon_id: chuyenNganhId, isDeleted: false }
        });

        if (!boMon) {
            return { errCode: 1, message: 'Bộ môn không tồn tại hoặc đã bị xóa.' };
        }

        await db.BoMon.update(
            { isDeleted: true },
            { where: { bomon_id: chuyenNganhId } }
        );

        await db.ChuyenNganh.update(
            { isDeleted: true },
            { where: { chuyennganh_id: chuyenNganhId } }
        );

        return { errCode: 0, message: 'Xóa bộ môn thành công!' };
    } catch (error) {
        throw error;
    }
};

const getAllChuyenNganh = async (target_khoa_id = null, target_chuyennganh_id = null) => {
    try {
        const where = { isDeleted: false };
        if (target_khoa_id) {
            where.khoa_id = target_khoa_id;
        }
        if (target_chuyennganh_id) {
            where.chuyennganh_id = target_chuyennganh_id;
        }

        const data = await db.ChuyenNganh.findAll({
            where,
            attributes: ['chuyennganh_id', 'ma_chuyennganh', 'ten_chuyennganh', 'mota', 'khoa_id'],
            include: [
                {
                    model: db.Khoa,
                    as: 'Khoa',
                    attributes: ['khoa_id', 'ma_khoa', 'ten_khoa']
                },
                {
                    model: db.MonHoc,
                    as: 'DanhSachMonHoc',
                    required: false,
                    where: { isDeleted: false },
                    attributes: ['monhoc_id', 'ma_mon', 'ten_mon']
                }
            ],
            order: [
                ['ten_chuyennganh', 'ASC'],
                [{ model: db.MonHoc, as: 'DanhSachMonHoc' }, 'ten_mon', 'ASC']
            ],
            raw: false,
            nest: true
        });

        const normalizedData = data.map((item) => {
            const json = item.toJSON();
            const monHocList = json.DanhSachMonHoc || [];
            return {
                ...json,
                so_luong_mon_hoc: monHocList.length
            };
        });

        return {
            errCode: 0,
            message: 'OK',
            data: normalizedData
        };
    } catch (error) {
        throw error;
    }
};

const createChuyenNganh = async (data) => {
    try {
        if (!data.khoa_id || !data.ma_chuyennganh || !data.ten_chuyennganh) {
            return { errCode: 1, message: 'Thiếu thông tin bắt buộc: khoa, mã chuyên ngành, tên chuyên ngành.' };
        }

        const khoa = await db.Khoa.findOne({ where: { khoa_id: data.khoa_id, isDeleted: false } });
        if (!khoa) {
            return { errCode: 2, message: 'Khoa không tồn tại.' };
        }

        const dup = await db.ChuyenNganh.findOne({
            where: {
                ma_chuyennganh: data.ma_chuyennganh.trim(),
                isDeleted: false
            }
        });
        if (dup) {
            return { errCode: 3, message: 'Mã chuyên ngành đã tồn tại!' };
        }

        await db.ChuyenNganh.create({
            khoa_id: data.khoa_id,
            ma_chuyennganh: data.ma_chuyennganh.trim(),
            ten_chuyennganh: data.ten_chuyennganh.trim(),
            mota: data.mota || null,
            isDeleted: false
        });

        return { errCode: 0, message: 'Tạo chuyên ngành thành công!' };
    } catch (error) {
        throw error;
    }
};

const updateChuyenNganh = async (data) => {
    try {
        if (!data.chuyennganh_id) {
            return { errCode: 1, message: 'Thiếu chuyennganh_id.' };
        }
        if (!data.khoa_id || !data.ma_chuyennganh || !data.ten_chuyennganh) {
            return { errCode: 2, message: 'Thiếu thông tin bắt buộc: khoa, mã chuyên ngành, tên chuyên ngành.' };
        }

        const chuyenNganh = await db.ChuyenNganh.findOne({
            where: { chuyennganh_id: data.chuyennganh_id, isDeleted: false },
            raw: false
        });
        if (!chuyenNganh) {
            return { errCode: 3, message: 'Chuyên ngành không tồn tại.' };
        }

        const khoa = await db.Khoa.findOne({ where: { khoa_id: data.khoa_id, isDeleted: false } });
        if (!khoa) {
            return { errCode: 4, message: 'Khoa không tồn tại.' };
        }

        const dup = await db.ChuyenNganh.findOne({
            where: {
                ma_chuyennganh: data.ma_chuyennganh.trim(),
                isDeleted: false,
                chuyennganh_id: { [db.Sequelize.Op.ne]: data.chuyennganh_id }
            }
        });
        if (dup) {
            return { errCode: 5, message: 'Mã chuyên ngành đã tồn tại!' };
        }

        chuyenNganh.khoa_id = data.khoa_id;
        chuyenNganh.ma_chuyennganh = data.ma_chuyennganh.trim();
        chuyenNganh.ten_chuyennganh = data.ten_chuyennganh.trim();
        chuyenNganh.mota = data.mota || null;
        await chuyenNganh.save();

        return { errCode: 0, message: 'Cập nhật chuyên ngành thành công!' };
    } catch (error) {
        throw error;
    }
};

const deleteChuyenNganh = async (chuyenNganhId) => {
    try {
        const chuyenNganh = await db.ChuyenNganh.findOne({
            where: { chuyennganh_id: chuyenNganhId, isDeleted: false }
        });

        if (!chuyenNganh) {
            return { errCode: 1, message: 'Chuyên ngành không tồn tại hoặc đã bị xóa.' };
        }

        await db.ChuyenNganh.update(
            { isDeleted: true },
            { where: { chuyennganh_id: chuyenNganhId } }
        );

        await db.MonHoc.update(
            { chuyennganh_id: null },
            {
                where: {
                    chuyennganh_id: chuyenNganhId,
                    isDeleted: false
                }
            }
        );

        return { errCode: 0, message: 'Xóa chuyên ngành thành công!' };
    } catch (error) {
        throw error;
    }
};

const getTruongBoMonOptions = async (khoaId = null) => {
    try {
        const whereGiangVien = { isDeleted: false };
        if (khoaId) whereGiangVien.khoa_id = khoaId;

        const data = await db.GiangVien.findAll({
            where: whereGiangVien,
            attributes: ['giangvien_id', 'ma_gv', 'ho', 'ten', 'khoa_id'],
            include: [
                {
                    model: db.TaiKhoan,
                    as: 'TaiKhoan',
                    required: false,
                    where: {
                        vaitro: { [db.Sequelize.Op.in]: ['truongbomon', 'giangvien'] }
                    },
                    attributes: ['taikhoan_id', 'username', 'vaitro', 'ref_id']
                }
            ],
            order: [['ten', 'ASC']],
            raw: false,
            nest: true
        });

        return {
            errCode: 0,
            message: 'OK',
            data: data.map((item) => ({
                taikhoan_id: item.TaiKhoan?.taikhoan_id || null,
                username: item.TaiKhoan?.username || null,
                vaitro: item.TaiKhoan?.vaitro || null,
                giangvien_id: item.giangvien_id,
                ma_gv: item.ma_gv,
                ho: item.ho,
                ten: item.ten,
                khoa_id: item.khoa_id,
                has_account: Boolean(item.TaiKhoan?.taikhoan_id)
            }))
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllKhoa,
    getKhoaById,
    createKhoa,
    updateKhoa,
    deleteKhoa,
    getAllBoMon,
    getAllBoMonRaw,
    createBoMon,
    updateBoMon,
    deleteBoMon,
    getAllChuyenNganh,
    createChuyenNganh,
    updateChuyenNganh,
    deleteChuyenNganh,
    getTruongBoMonOptions
};

