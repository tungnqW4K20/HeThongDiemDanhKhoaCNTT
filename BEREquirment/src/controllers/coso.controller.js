const cosoService = require('../services/coso.service');

const handleGetAllCoSo = async (req, res) => {
    try {
        let data = await cosoService.getAllCoSo();
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(200).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
}

module.exports = {
    handleGetAllCoSo
}