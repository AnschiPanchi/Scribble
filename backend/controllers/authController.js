const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Session = require('../models/Session');

const { sendVerificationEmail } = require('../utils/mailer');
const crypto = require('crypto');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret123', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'refresh123', { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  // Traditional Registration
  let user = null;
  try {
    const { username, email, password } = req.body;

    // Check for existing scouts
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'This email is already in the database.' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Callsign already taken by another operator.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = await User.create({
      username,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      verificationToken
    });

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (mailErr) {
      console.error(`\x1b[33m⚠ Mailer Offline: ${mailErr.message}\x1b[0m`);
      // In dev, let them pass through even if email fails
      if (process.env.NODE_ENV !== 'development') {
        throw mailErr;
      }
    }

    res.status(201).json({
      message: 'Account initialized successfully.',
      debug: process.env.NODE_ENV === 'development' ? 'Email delivery skipped in dev mode.' : null
    });
  } catch (err) {
    if (user && user._id) {
      await User.findByIdAndDelete(user._id);
    }
    res.status(500).json({ error: `System Failure: ${err.message}` });
  }
};

exports.login = async (req, res) => {
  // Traditional Login
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.googleId) return res.status(400).json({ error: 'Invalid credentials or use Google Login' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    // Identity Lockdown: Mandatory Email Verification Check
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Mission Denied: Identity not verified. Check your encrypted email.' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store session
    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ accessToken, user: { 
      id: user._id, 
      username: user.username, 
      email: user.email,
      coins: user.coins,
      purchasedItems: user.purchasedItems,
      activeGear: user.activeGear,
      avatar: user.avatar
    } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

    const session = await Session.findOne({ refreshToken }).populate('userId');
    if (!session) return res.status(401).json({ error: 'Invalid session' });

    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh123');
    } catch (err) {
      await Session.deleteOne({ refreshToken });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const tokens = generateTokens(session.userId._id);

    // Rotate token
    session.refreshToken = tokens.refreshToken;
    session.lastActive = Date.now();
    await session.save();

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ accessToken: tokens.accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await Session.deleteOne({ refreshToken });
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const token = req.body.idToken || req.body.token;
    if (!token) return res.status(400).json({ error: 'Auth token missing' });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { name, email, sub, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: name,
        email,
        googleId: sub,
        isEmailVerified: true,
        avatar: picture
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ accessToken, user: { 
      id: user._id, 
      username: user.username, 
      email: user.email, 
      avatar: user.avatar,
      coins: user.coins,
      purchasedItems: user.purchasedItems,
      activeGear: user.activeGear
    } });
  } catch (err) {
    res.status(500).json({ error: 'Google Auth Failed' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Identity confirmed. Access granted to Scribble X.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification system offline.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.user; // From auth middleware (to be added)
    const { username, avatar } = req.body;
    
    // Check if username taken (if changed)
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: id } });
      if (existing) return res.status(400).json({ error: 'Callsign already taken.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { username, avatar } },
      { new: true }
    );
    
    res.status(200).json({ user: {
      username: user.username,
      avatar: user.avatar,
      coins: user.coins,
      purchasedItems: user.purchasedItems,
      activeGear: user.activeGear
    }, message: 'Profile updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
