const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OTPSchema = new Schema({
  email: { type: String, unique: true },
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

const OIP = mongoose.model("OTP", OTPSchema);

module.exports = OIP;