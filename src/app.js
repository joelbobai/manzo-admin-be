require("./config/mongodb");
const express = require("express");
const routes = require("./routes");
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Init Express App
const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(morgan('dev'));

// Init Dotenv
require("dotenv").config();

// Parse JSON Date
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow multiple origins
const allowedOrigins = [

  "https://manzo.ng",

  "https://admin.manzo.com.ng",
];

const corsOptions = {
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  origin(origin, callback) {
    // Check if the request origin is in the list of allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (req.method !== "OPTIONS") {
    next();
    return;
  }

  cors(corsOptions)(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }

    res.sendStatus(204);
  });
});

app.use("/api/v1", routes);

module.exports = app;
