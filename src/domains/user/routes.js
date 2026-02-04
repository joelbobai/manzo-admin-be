const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('./model');
const Session = require('../session/model');
const PasswordReset = require('../PasswordReset/model');
const { sendSignupEmail } = require("../../util/emailService");
const { requireAuth, requireRole } = require('../../middleware/auth');
const {
  hashPassword,
  verifyPassword,
  randomToken,
  sha256,
} = require('../../util/crypto');

const router = express.Router();

function serializeUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    canReserveTickets: user.canReserveTickets,
    canIssueTickets: user.canIssueTickets,
    canRetrieveTickets: user.canRetrieveTickets,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// TODO: replace with real email delivery
async function sendPasswordResetEmail(email, link) {
  console.info('Sending password reset email', { email, link });
}

function signAccess(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TTL || '7d' }
  );
}


router.post('/subadmin/signup', requireAuth, requireRole('main_admin'), async (req, res) => {
try {
    const { fullName, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: 'sub_admin',
    });

    await sendSignupEmail({fullName, email});

    res.status(201).json({
      ...serializeUser(user),
    });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);

    await Session.create({
      userId: user._id,
      refreshTokenHash: sha256(refreshToken),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      accessToken,
      refreshToken,
      user: serializeUser(user),
    });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const session = await Session.findOne({
      userId: payload.sub,
      refreshTokenHash: sha256(refreshToken),
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const accessToken = signAccess(user);
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await Session.deleteOne({ refreshTokenHash: sha256(refreshToken) });
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const raw = randomToken(32);
      const tokenHash = sha256(raw);
      const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES || 30);
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await PasswordReset.create({
        userId: user._id,
        tokenHash,
        expiresAt,
      });

      const link = `${process.env.CLIENT_BASE_URL}/reset-password?token=${raw}`;
      await sendPasswordResetEmail(user.email, link);
    }

    res.json({
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const record = await PasswordReset.findOne({
      tokenHash: sha256(token),
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(record.userId);
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.passwordHash = await hashPassword(password);
    await user.save();

    record.usedAt = new Date();
    await record.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

router.get('/subadmins', requireAuth, requireRole('main_admin'), async (req, res) => {
  try {
    const { search } = req.query;
    const query = { role: 'sub_admin' };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const subAdmins = await User.find(query).sort({ createdAt: -1 });
    res.json(subAdmins.map(serializeUser));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch(
  '/subadmins/:id/status',
  requireAuth,
  requireRole('main_admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean' });
      }

      const subAdmin = await User.findOneAndUpdate(
        { _id: id, role: 'sub_admin' },
        { isActive },
        { new: true }
      );

      if (!subAdmin) {
        return res.status(404).json({ message: 'Sub-admin not found' });
      }

      res.json(serializeUser(subAdmin));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.patch(
  '/subadmins/:id/permissions',
  requireAuth,
  requireRole('main_admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { canIssueTickets, canReserveTickets, canRetrieveTickets, canCancelTickets } = req.body;

      const update = {};

      if (typeof canIssueTickets === 'boolean') update.canIssueTickets = canIssueTickets;
      if (typeof canReserveTickets === 'boolean') update.canReserveTickets = canReserveTickets;
      if (typeof canRetrieveTickets === 'boolean') update.canRetrieveTickets = canRetrieveTickets;
      if (typeof canCancelTickets === 'boolean') update.canCancelTickets = canCancelTickets;

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'No valid permissions provided' });
      }

      const subAdmin = await User.findOneAndUpdate(
        { _id: id, role: 'sub_admin' },
        update,
        { new: true }
      );

      if (!subAdmin) {
        return res.status(404).json({ message: 'Sub-admin not found' });
      }

      res.json(serializeUser(subAdmin));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
