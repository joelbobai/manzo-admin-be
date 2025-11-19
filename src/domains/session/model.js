const { Schema, model, Types } = require('mongoose');

const SessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = model('Session', SessionSchema);
