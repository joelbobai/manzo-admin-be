const OTP = require("../otp/model");
const User = require("./../user/model");
const generateOTP = require("./../../util/generateOTP");
const { verifyOTP, deleteOTP } = require("./../otp/controller");
const { sendPasswordResetEmail } = require("../../util/emailService");
const { hashData, verifyHashedData } = require("../../util/hashData");
const {
  hashPassword
} = require('../../util/crypto')

const resetUserPassword = async ({ token, code, password }) => {
  try {
    // ensure otp record exists
    const matchedOTPRecord = await OTP.findOne({ otp: token });

    if (!matchedOTPRecord) {
      throw Error("No otp records found, Invalid code passed, Check your inbox.");
    }

    const { expiresAt, email } = matchedOTPRecord;
    if (expiresAt < Date.now()) {
      throw Error("Code has expired. Request for a new one.");
    };

  const ok = await verifyHashedData(code, token);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    
    // now update user record with new password.
    /* eslint-disable no-useless-escape */

    const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
// console.log("Password:", password);
// console.log("email", email);
    if (password.length < 8) {
      throw Error("Password is too short!");
    } else if (!specialChars.test(password)) {
      throw Error("Password must have special character");
    }
    // hash new password
    const hashedNewPassword = await hashPassword(password);
    await User.updateOne({ email }, { passwordHash: hashedNewPassword });
    await deleteOTP(email);

    return;
  } catch (error) {
    throw error;
  }
};

const sendPasswordResetOTPEmail = async (email) => {
  try {
    // check if an account exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw Error("There's no account for the provided email.");
    }

    // if (!existingUser.verified) {
    //   throw Error("Email hasn't been verified yet. Check your inbox.");
    // }
    
   let    subject = "Password Reset";
   let   message = "To help confirm your identity with us on Manzo, paste this code in your web.";
   let   duration = 1;
    

       if (!(email && subject && message)) {
      throw Error("Provide values for email, subject, message");
    }

    // clear any old record
    await OTP.deleteOne({ email });

    // generate pin
    const generatedOTP = await generateOTP();
 
  //  const currentUrl = `http://localhost:5000/api/v1/email_verification/verify/${email}/${generatedOTP}`;

    
const hashedOTP = await hashData(generatedOTP);
  const currentUrl = `https://admin.manzo.com.ng/reset-password?token=${hashedOTP}`;
  await sendPasswordResetEmail({email, subject, message, duration, generatedOTP, currentUrl});
    const newOTP = new OTP({
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000 * +duration,
    });

    const createdOTPRecord = await newOTP.save();

    return createdOTPRecord;
  } catch (error) {
    throw error;
  }
};

module.exports = { sendPasswordResetOTPEmail, resetUserPassword };