const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-admin', authController.loginAdmin);
router.post('/refresh', authController.refreshToken);
router.post('/create-admin', authController.createAdmin);
module.exports = router;
