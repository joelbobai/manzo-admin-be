const { Schema, model } = require('mongoose');

const UserSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    canReserveTickets: { type: Boolean, default: false },
  canIssueTickets: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['main_admin', 'sub_admin'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

module.exports = model('User', UserSchema);