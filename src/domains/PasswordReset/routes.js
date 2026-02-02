const express = require("express");
const router = express.Router();
// const auth = require("./../../middleware/auth");

const {
  sendPasswordResetOTPEmail,
  resetUserPassword,
} = require("./controller");

router.post("/reset", async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (!(email && otp && newPassword))
      throw Error("Empty credentials are not allowed.");

    await resetUserPassword({ email, otp, newPassword });
    res.status(200).json({ email, passwordReset: true });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Password reset request
router.post("/", async (req, res) => {
  try {
    let { email } = req.body;

    email = email.trim();

    if (!email) {
      throw Error("Empty input fields!");
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      throw Error("Invalid email entered");
    }
    const createPasswordResetOTP = await sendPasswordResetOTPEmail(email);
    res.status(200).json(createPasswordResetOTP);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = router;