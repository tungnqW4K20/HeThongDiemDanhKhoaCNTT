'use strict';
const express = require('express');
const router = express.Router();
const cosoController = require('../controllers/coso.controller');

router.get('/all', cosoController.handleGetAllCoSo);

module.exports = router;
