const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = { hashPassword, verifyPassword, randomToken, sha256 };
