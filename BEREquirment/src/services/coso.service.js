const db = require('../models');
const {CoSo } = db;

const getAllCoSo = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const data = await CoSo.findAll({
                attributes: ['coso_id', 'ten_coso', 'dia_chi'],
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

module.exports = {
    getAllCoSo
}