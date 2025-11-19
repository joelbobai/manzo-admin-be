// const OTP = require("./model");
// const generateOTP = require("./../../util/generateOTP");
// const sendEmail = require("./../../util/sendEmail");
// const { hashData, verifyHashedData } = require("./../../util/hashData");

const verifyOTP = async ({ email, otp }) => {
  try {
    if (!(email && otp)) {
      throw Error("Provide values for email, otp");
    }

    // ensure otp record exists
    const matchedOTPRecord = await OTP.findOne({ email });

    if (!matchedOTPRecord) {
      throw Error("No otp records found.");
    }

    const { expiresAt } = matchedOTPRecord;
    if (expiresAt < Date.now()) {
      throw Error("Code has expired. Request for a new one.");
    }

    // not expired yet, verify value
    const hashedOTP = matchedOTPRecord.otp;
    const validOTP = await verifyHashedData(otp, hashedOTP);

    return validOTP;
  } catch (error) {
    throw error;
  }
};

const sendResetPasswordOTP = async ({
  email,
  subject,
  message,
  duration = 1,
}) => {
  //   try {
  //     if (!(email && subject && message)) {
  //       throw Error("Provide values for email, subject, message");
  //     }
  //     // clear any old record
  //     await OTP.deleteOne({ email });
  //     // generate pin
  //     const generatedOTP = await generateOTP();
  //     const currentUrl = `http://localhost:5000/api/v1/email_verification/verify/${email}/${generatedOTP}`;
  //     // send email
  //     const mailOptions = {
  //       from: "Rama Dreams <no-reply@ramadreams.com>",
  //       to: email,
  //       subject,
  //       html: `<!DOCTYPE html>
  //       <html lang="en">
  //       <head>
  //           <meta charset="UTF-8">
  //           <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //           <title>Ramadreams OTP</title>
  //           <style>
  //               body {
  //                   font-family: Arial, sans-serif;
  //                   background-color: #f5f5f5;
  //                   margin: 0;
  //                   padding: 20px;
  //                   display: flex;
  //                   justify-content: center;
  //                   align-items: center;
  //                   height: 100vh;
  //               }
  //               .container {
  //                   text-align: center;
  //                   background-color: #fff;
  //                   padding: 20px;
  //                   border-radius: 8px;
  //                   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  //                   border: 2px solid #596E79;
  //               }
  //               h3 {
  //                   color: #333;
  //               }
  //               h1 {
  //                   color: #596E79;
  //                   font-size: 38px;
  //                   margin: 10px 0;
  //                   border: 2px solid #596E79;
  //                   padding: 10px;
  //                   border-radius: 8px;
  //               }
  //               p {
  //                   color: #666;
  //                   margin: 10px 0;
  //               }
  //           </style>
  //       </head>
  //       <body>
  //           <div class="container">
  //               <h3>Your Ramadreams OTP Code</h3>
  //               <p>Your security code is:</p>
  //               <h1>${generatedOTP}</h1>
  //               <p>${message}</p>
  //           </div>
  //       </body>
  //       </html>
  //       `,
  //     };
  //     await sendEmail(mailOptions);
  //     // save otp record
  //     const hashedOTP = await hashData(generatedOTP);
  //     const newOTP = await new OTP({
  //       email,
  //       otp: hashedOTP,
  //       createdAt: Date.now(),
  //       expiresAt: Date.now() + 3600000 * +duration,
  //     });
  //     const createdOTPRecord = await newOTP.save();
  //     return createdOTPRecord;
  //   } catch (error) {
  //     throw error;
  //   }
};
const sendOTP = async ({ email, subject, message, duration = 1 }) => {
  try {
    if (!(email && subject && message)) {
      throw Error("Provide values for email, subject, message");
    }

    // clear any old record
    await OTP.deleteOne({ email });

    // generate pin
    const generatedOTP = await generateOTP();
    const currentUrl = `http://localhost:4000/api/v1/email_verification/verify/${email}/${generatedOTP}`;

    // send email
    const mailOptions = {
      from: "Lilly Beauty Fashion <noreply@lillybeautyfashion.com>",
      to: email,
      subject,
      html: `<!DOCTYPE html>
      <html lang="en"> 
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirm Email</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;700&display=swap">
          <style>
          html,
              body {
                  font-family: 'Raleway', sans-serif;
                  background-color: #f0f8ff;
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
              }
      
              .container {
                  background-color: #fff;
                  padding: 40px;
                  border-radius: 8px;
                  margin: 0 auto;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 400px;
                  width: 90%;
              }
      
              h1 {
                  color: #3d4e68;
                  font-size: 28px;
                  margin-bottom: 20px;
              }
      
              p {
                  color: #6f8198;
                  font-size: 14px;
                  line-height: 1.6;
                  margin-bottom: 25px;
              }
      
              button {
                  background-color: #596e79;
                  padding: 12px 30px;
                  border: none;
                  color: white;
                  border-radius: 5px;
                  cursor: pointer;
                  transition: background-color 0.3s ease;
              }
      
              button:hover {
                  background-color: #596e90;
              }
      
              .footer {
                  color: #888;
                  font-size: 12px;
                  margin-top: 20px;
              }
              a{
                color: #fff;
              }
          </style>
      </head>
      <body>
          <div class="container">
          <h1>Confirm Your Email Address</h1>
          <p>${message}</p>
          <h1>${generatedOTP}<h1>
         <button>
          <a style="color: #fff;" href="${currentUrl}">Confirm Email Address</a>
         </button>
         <h6>expires in ${duration} hour(s)</h6>
              <h6>If you have already confirmed your email address, ignore this message.</h6>
              <div class="footer">
                  <p>Need Help? Contact us at <a href="mailto:talktous@lillybeautyfashion.com">talktous@lillybeautyfashion.com</a></p>
                  <p>&copy; Lilly Beauty Fashion</p> 
              </div>
          </div>
      </body>
      </html>      
      `,
    };
    await sendEmail(mailOptions);

    // save otp record

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

const deleteOTP = async (email) => {
  try {
    await OTP.deleteOne({ email });
  } catch (err) {
    throw err;
  }
};

module.exports = { sendOTP, verifyOTP, deleteOTP, sendResetPasswordOTP };