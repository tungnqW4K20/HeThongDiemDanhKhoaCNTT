const db = require('../models');
const {CoSo } = db;

const getAllCoSo = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await CoSo.findAll({
                where: { isDeleted: false },
                attributes: ['coso_id', 'ten_coso', 'dia_chi', 'mota'],
                raw: true,
                nest: true
            });
            resolve({
                errCode: 0,
                message: 'OK',
                data: data
            });
        } catch (e) {
            reject(e);
        }
    });
};

const createCoSo = async (payload) => {
    try {
        const ten = String(payload?.ten_coso || '').trim();
        const diaChi = String(payload?.dia_chi || '').trim();
        const mota = String(payload?.mota || '').trim();

        if (!ten) {
            return {
                errCode: 1,
                message: 'Tên cơ sở không được để trống'
            };
        }

        const existed = await CoSo.findOne({
            where: {
                ten_coso: ten,
                isDeleted: false
            }
        });

        if (existed) {
            return {
                errCode: 2,
                message: 'Cơ sở đã tồn tại'
            };
        }

        await CoSo.create({
            ten_coso: ten,
            dia_chi: diaChi || null,
            mota: mota || null
        });

        return {
            errCode: 0,
            message: 'Thêm cơ sở thành công'
        };
    } catch (error) {
        throw error;
    }
};

const updateCoSo = async (payload) => {
    try {
        const id = payload?.coso_id;
        const ten = String(payload?.ten_coso || '').trim();
        const diaChi = String(payload?.dia_chi || '').trim();
        const mota = String(payload?.mota || '').trim();

        if (!id || !ten) {
            return {
                errCode: 1,
                message: 'Thiếu thông tin bắt buộc'
            };
        }

        const record = await CoSo.findOne({
            where: {
                coso_id: id,
                isDeleted: false
            }
        });

        if (!record) {
            return {
                errCode: 2,
                message: 'Không tìm thấy cơ sở'
            };
        }

        const duplicated = await CoSo.findOne({
            where: {
                ten_coso: ten,
                isDeleted: false,
                coso_id: { [db.Sequelize.Op.ne]: id }
            }
        });

        if (duplicated) {
            return {
                errCode: 3,
                message: 'Tên cơ sở đã tồn tại'
            };
        }

        record.ten_coso = ten;
        record.dia_chi = diaChi || null;
        record.mota = mota || null;
        await record.save();

        return {
            errCode: 0,
            message: 'Cập nhật cơ sở thành công'
        };
    } catch (error) {
        throw error;
    }
};

const deleteCoSo = async (id) => {
    try {
        const record = await CoSo.findOne({
            where: {
                coso_id: id,
                isDeleted: false
            }
        });

        if (!record) {
            return {
                errCode: 1,
                message: 'Cơ sở không tồn tại hoặc đã bị xóa'
            };
        }

        await record.update({ isDeleted: true });

        return {
            errCode: 0,
            message: 'Xóa cơ sở thành công'
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getAllCoSo,
    createCoSo,
    updateCoSo,
    deleteCoSo
};