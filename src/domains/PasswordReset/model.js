const { Schema, model, Types } = require('mongoose');

const PasswordResetSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = model('PasswordReset', PasswordResetSchema);
