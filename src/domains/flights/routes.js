const express = require("express");
const FlightBooking = require("./model");
const mongoose = require("mongoose");
const { getAccessToken } = require("../../config/amadeus");
const { flightBooking } = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const User = require("../user/model");

let accessToken;
let accessTokenPromise;

const TOKEN_REFRESH_INTERVAL_MS = 28 * 60 * 1000;




const refreshAccessToken = async () => {
  try {
    accessToken = await getAccessToken();
    return accessToken;
  } catch (error) {
    console.error("Failed to refresh access token", error);
    throw error;
  }
};

const ensureAccessToken = async () => {
  if (accessToken) {
    return accessToken;
  }

  if (!accessTokenPromise) {
    accessTokenPromise = refreshAccessToken().finally(() => {
      accessTokenPromise = null;
    });
  }

  return accessTokenPromise;
};

refreshAccessToken().catch(() => {
  // Failure is logged in refreshAccessToken. Subsequent requests will retry.
});

setInterval(() => {
  refreshAccessToken().catch(() => {
    // Failure is logged above; keep attempting refresh silently.
  });
}, TOKEN_REFRESH_INTERVAL_MS);

const router = express.Router();



// Middleware to ensure authentication
router.use(async (req, res, next) => {
  try {
    await ensureAccessToken();
  } catch (error) {
    return res.status(503).json({ error: "Unable to obtain access token" });
  }

  if (!accessToken) {
    return res.status(503).json({ error: "Unable to obtain access token" });
  }

  next();
});

const ensureCanIssueTickets = async (req, res, next) => {
  const { role, sub } = req.user || {};

  if (role === "main_admin") {
    return next();
  }

  if (role !== "sub_admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const user = await User.findById(sub);

    if (!user || !user.isActive) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!user.canIssueTickets) {
      return res
        .status(403)
        .json({ message: "Sub-admin is not allowed to issue tickets" });
    }

    return next();
  } catch (error) {
    console.error("Error checking issuance permission", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

router.post("/createdIssuanceBooked", async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId || bookingId.trim() === "") {
      return res.status(400).json({ error: "Empty bookingId input field!" });
    }

    // Validate ObjectId if using MongoDB's _id field
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "Invalid bookingId format!" });
    }

    const createdIssuance = await FlightBooking.findOne({ _id: bookingId });

    if (!createdIssuance) {
      return res.status(404).json({ error: "Issuance not found!" });
    }

    res.status(200).json(createdIssuance);
  } catch (error) {
    console.error("Error fetching issuance:", error);
    res.status(500).json({ error: "Internal server error" });
    // .send(error.message)
  }
});


// Flight Create Orders => Flight IssueTicket
router.post(
  "/issueTicket",
  requireAuth,
  ensureCanIssueTickets,
  async (req, res) => {
    try {

      let { reservedId } = req.body;

      if (!reservedId) {
        return res.status(400).send("Empty travelers input fields!");
      }

      const booked = await flightBooking({
        reservedId,
        accessToken,
      });
      res.status(200).json({ issueId: booked?._id, status: booked?.status });
    } catch (error) {
      console.error("Error sending booking:1", error);
      console.error("Error sending boooking:2", error?.response?.data?.errors);
      res.sendStatus(500);
    }
  }
);

// Get all flight bookings
router.get("/bookings", requireAuth, ensureCanIssueTickets, async (req, res) => {
  try {
    const bookings = await FlightBooking.find();
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
