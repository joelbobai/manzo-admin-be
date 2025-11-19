const mongoose = require("mongoose");

// .Env config
require("dotenv").config();

// url
const { MONGO_URL, NODE_ENV } = process.env;

let url = `${MONGO_URL}${NODE_ENV === "development"?  'test_server' : 'live_server' }`;
// console.log("MongoDB URL:", url);
const connectToDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(url);

    console.log("Backend database running");
  } catch (error) {
    console.log(`${error} did not work`);
  }
};

connectToDB();
