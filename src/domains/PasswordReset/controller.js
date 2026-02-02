const User = require("./../user/model");
const OTP = require("./model");
const generateOTP = require("./../../util/generateOTP");
const { verifyOTP, deleteOTP } = require("./../otp/controller");
const { sendPasswordResetEmail } = require("../../util/emailService");
const { hashData } = require("../../util/hashData");

const resetUserPassword = async ({ email, otp, newPassword }) => {
  try {
    const validOTP = await verifyOTP({ email, otp });
    if (!validOTP) {
      throw Error("Invalid code passed, Check your inbox.");
    }
    // now update user record with new password.
    /* eslint-disable no-useless-escape */
    const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

    if (newPassword.length < 8) {
      throw Error("Password is too short!");
    } else if (!specialChars.test(newPassword)) {
      throw Error("Password must have special character");
    }
    // hash new password
    const hashedNewPassword = await hashData(newPassword);
    await User.updateOne({ email }, { password: hashedNewPassword });
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

    await sendPasswordResetEmail({email, subject, message, duration, generatedOTP});
const hashedOTP = await hashData(generatedOTP);

    const newOTP = await new OTP({
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