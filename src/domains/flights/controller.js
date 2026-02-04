const axios = require("axios");
const FlightBooking = require("./model");
const {
  sendIssuanceEmail,
  sendReservationEmail,
} = require("./../../util/emailService");

const { AMA_API_KEY, NODE_ENV } = process.env;

const AMADEUS_DOMAIN =
  NODE_ENV === "development"
    ? "https://test.travel.api.amadeus.com"
    : "https://travel.api.amadeus.com";




const AMADEUS_HEADERS = {
  "Content-Type": "application/vnd.amadeus+json",
};

const COMMISSION_BY_CARRIER = new Map([
  ["SA", 9],
  ["UR", 3],
  ["HR", 0],
  ["5Z", 0],
  ["TK", 0],
  ["HF", 6],
  ["KQ", 0],
  ["MS", 7],
  ["KP", 6],
  ["WB", 10],
  ["ET", 13],
  ["BA", 12],
  ["AF", 0],
  ["QR", 9],
  ["AT", 6],
  ["AW", 3],
  ["P4", 6],
  ["LH", 0],
  ["DL", 0],
  ["KL", 0],
  ["DT", 6],
]);

function getCommission(iataCode) {
  if (!iataCode) {
    return 0;
  }

  const normalizedCode = String(iataCode).toUpperCase();
  return COMMISSION_BY_CARRIER.get(normalizedCode) ?? 0;
}








const flightCancel = async (data) => {
  try {
console.log("cancelling flight", AMA_API_KEY);
console.log("access token", data?.accessToken);
console.log("flight id", data?.id);
    const response = await axios.post(
      `${AMADEUS_DOMAIN}/v1/booking/flight-orders/${data?.id}`,
      {},
      {
        headers: {
          "Content-Type": "application/vnd.amadeus+json",
          "ama-client-ref": AMA_API_KEY,
          Authorization: `Bearer ${data?.accessToken}`,
        },
      }
    );

    if (response) {
      console.log(response)
    }

    // if (!flight) {
    //   throw new Error("Unable to retrieve flight issuance details");
    // }

    return response;
  } catch (err) {
    console.error("error Cancel Tickets", err);
    throw err;
  }
};

const flightIssuance = async (data) => {
  try {
    let flight;

    const response = await axios.post(
      `${AMADEUS_DOMAIN}/v1/booking/flight-orders/${data?.id}/issuance`,
      {},
      {
        headers: {
          "Content-Type": "application/vnd.amadeus+json",
          "ama-client-ref": AMA_API_KEY,
          Authorization: `Bearer ${data?.accessToken}`,
        },
      }
    );

    if (response?.data?.data) {
      flight = response?.data?.data;
    }

    if (!flight) {
      throw new Error("Unable to retrieve flight issuance details");
    }

    return response;
  } catch (err) {
    console.error("error flightReserved", err);
    throw err;
  }
};
const flightReserved = async (data) => {
  try {
    let flight;
    const response = await axios.post(
      `${AMADEUS_DOMAIN}/v1/booking/flight-orders`,
      data?.data,
      {
        headers: {
          "Content-Type": "application/vnd.amadeus+json",
          "ama-client-ref": AMA_API_KEY,
          Authorization: `Bearer ${data?.accessToken}`,
        },
      }
    );

    if (response?.data?.data) {
      flight = response?.data?.data;
    }

    if (!flight) {
      throw new Error("Unable to reserve flight booking");
    }

    sendReservationEmail({
      flight,
      data: {
        mails: data?.mails,
        dictionaries: data?.dictionaries,
      },
    }).catch((error) => {
      console.error("Failed to queue reservation email", error);
    });
    return response;
  } catch (err) {
    console.error("error flightReserved", err);
    throw err;
  }
};
const flightCommission = async (data) => {
  try {
    const response = await axios.patch(
      `${AMADEUS_DOMAIN}/v1/booking/flight-orders/${data?.id}`,
      data?.data,
      {
        headers: {
          "Content-Type": "application/vnd.amadeus+json",
          "ama-client-ref": AMA_API_KEY,
          Authorization: `Bearer ${data?.accessToken}`,
        },
      }
    );
    return response;
  } catch (err) {
    console.error("error flightReserved", err);
    throw err;
  }
};

const flightBooking = async (bookingInput) =>  { 
  const mails = ["manzotravels@gmail.com", "joelisaiahbobai@gmail.com"];

  const commissionPercentage = getCommission(
    bookingInput?.flight?.validatingAirlineCodes?.[0]
  );
  try {
    // const verifyTransaction = await paystackVerifyTransaction(
    //   bookingInput.transactionReference
    // );
    const commissionPayload = JSON.stringify({
      data: {
        type: "flight-order",
        commissions: [
          {
            controls: ["MANUAL"],
            values: [
              {
                commissionType: "NEW",
                percentage: commissionPercentage,
              },
            ],
          },
        ],
      },
    });

    // checking if transaction already exists
    const existingTransaction = await FlightBooking.findOne({
      $or: [
        { reference: bookingInput.transactionReference },
        { reservationId: bookingInput.reservedId },
      ],
    });
    if (existingTransaction && existingTransaction.status === "booked") {
      throw Error(
        "User with the provided Transaction Reference already exists"
      );
    }
    // if (verifyTransaction?.data?.status !== "success") {
    //   throw Error("Paystack transaction was not successful");
    // }

    

    if (!bookingInput?.reservedId) {
      throw new Error("Unable to reserve flight booking");
    }

    await flightCommission({
      id: bookingInput?.reservedId,
      accessToken: bookingInput.accessToken,
      data: commissionPayload,
    });

    const issuanceResponse = await flightIssuance({
      id: bookingInput?.reservedId,
      accessToken: bookingInput.accessToken,
    });

    const booking = await FlightBooking.findOneAndUpdate(
      { reservationId: bookingInput.reservedId },
      {
        $set: {
            userId: bookingInput.userId,
          FlightBooked: issuanceResponse?.data?.data,
          status: "booked",
        },
        $setOnInsert: {
          reservationId: bookingInput.reservedId,
        },
      },
      { new: true, upsert: true }
    );
    const bookingId = booking?._id;

    issuanceResponse?.data?.data?.travelers?.forEach((traveler) => {
      const email = traveler?.contact?.emailAddress;
      if (email) {
        mails.push(email);
      }
    });

    const uniqueMails = [...new Set(mails)];

    sendIssuanceEmail({
      flight: issuanceResponse?.data?.data,
      id: bookingId,
      data: {
        mails: uniqueMails,
        dictionaries: bookingInput.littelFlightInfo?.[0]?.dictionaries,
      },
    }).catch((error) => {
      console.error("Failed to queue issuance email", error);
    });

    return booking;
  } catch (err) {
    const errorMessage = err?.response?.data || err.message || err;
    console.error("error in booking and issuing ticket", errorMessage);
    throw err;
  }
};

const flightCancelTickets = async (bookingInput) =>  { 

try{
    
    

    if (!bookingInput?.reservedId) {
      throw new Error("Unable to reserve flight booking");
    }

    

  await flightCancel({
      id: bookingInput?.reservedId,
      accessToken: bookingInput.accessToken,
    });

    const booking = await FlightBooking.findOneAndUpdate(
      { reservationId: bookingInput.reservedId },
      {
        $set: {
          status: "cancelled",
        },
        $setOnInsert: {
          reservationId: bookingInput.reservedId,
        },
      },
      { new: true, upsert: true }
    );
    
    return booking;
  } catch (err) {
    const errorMessage = err?.response?.data || err.message || err;
    console.error("error in booking and issuing ticket", errorMessage);
    throw err;
  }
};


module.exports = {
flightCancelTickets,
  flightBooking
};
