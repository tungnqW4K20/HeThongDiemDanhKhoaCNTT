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

const handleCreateCoSo = async (req, res) => {
    try {
        const data = await cosoService.createCoSo(req.body);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleUpdateCoSo = async (req, res) => {
    try {
        const data = await cosoService.updateCoSo(req.body);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

const handleDeleteCoSo = async (req, res) => {
    try {
        const id = req.body?.id;
        if (!id) {
            return res.status(400).json({
                errCode: 1,
                message: 'Missing required parameter id'
            });
        }
        const data = await cosoService.deleteCoSo(id);
        return res.status(200).json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            errCode: -1,
            message: 'Error from server'
        });
    }
};

module.exports = {
    handleGetAllCoSo,
    handleCreateCoSo,
    handleUpdateCoSo,
    handleDeleteCoSo
};