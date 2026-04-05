const express = require('express');
const { register, login, logout, refresh, googleAuth, verifyEmail, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// standard endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

// google oauth endpoint placeholder
router.post('/google', googleAuth);
router.get('/verify-email', verifyEmail);

// profile management
router.put('/profile', protect, updateProfile);

module.exports = router;
