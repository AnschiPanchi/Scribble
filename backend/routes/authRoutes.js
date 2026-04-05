const express = require('express');
const { register, login, logout, refresh, googleAuth } = require('../controllers/authController');

const router = express.Router();

// standard endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// google oauth endpoint placeholder
router.post('/google', googleAuth);

module.exports = router;
