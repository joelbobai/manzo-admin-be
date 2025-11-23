const express = require("express");
const router = express.Router();

const userRoutes = require("./../domains/user");
const OTPRoutes = require("./../domains/otp");
const EmailVerificationRoutes = require("./../domains/email_verification");
const PasswordResetRoutes = require("./../domains/PasswordReset");
const SessionRoutes = require("./../domains/session");

const flightsRoutes = require("./../domains/flights");


// router.use("/otp", OTPRoutes);
router.use("/user", userRoutes);
// router.use("/email_verification", EmailVerificationRoutes);
router.use("/password_reset", PasswordResetRoutes);
router.use("/session", SessionRoutes);
router.use("/flights", flightsRoutes);


module.exports = router;