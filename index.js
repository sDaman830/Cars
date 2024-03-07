const express = require("express");
const mongoose = require("mongoose");
const ParkingLot = require("./models/parkinglot");

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://anuragsyec21:GKJ6ikieWrDAsJnY@cluster0.z6pebny.mongodb.net/Mfiness",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Middleware for parsing JSON data
app.use(express.json());
const { v4: uuidv4 } = require("uuid"); // Using destructuring for clarity

app.post("/api/ParkingLots", async (req, res) => {
  try {
    const { capacity, id } = req.body;
    const parkingLot = await ParkingLot.findOne({ id: id });
    // Input validations
    if (
      !capacity ||
      typeof capacity !== "number" ||
      capacity < 0 ||
      capacity > 2000
    ) {
      return res.status(400).json({
        isSuccess: false,
        message:
          "Invalid capacity provided. Capacity must be between 0 and 2000.",
      });
    }

    if (id && (!/^[0-9a-f]{24}$/i.test(id) || typeof id !== "string")) {
      // Validate hexadecimal string (24 characters)
      return res.status(400).json({
        isSuccess: false,
        message:
          "Invalid id provided. ID should be a 24-character hexadecimal string.",
      });
    }

    const newParkingLot = new ParkingLot({
      capacity,

      id: id || uuidv4(), // Generate unique ID if not provided
      isActive: true, // Adding optional "isActive" field set to true
    });

    await newParkingLot.save();

    res.status(201).json({
      isSuccess: true,
      response: {
        id: newParkingLot.id,
        capacity,
        isActive: newParkingLot.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      isSuccess: false,
      message: "Error creating parking lot",
    });
  }
});

// 2. Park car in the parking (POST /api/parking-lots/:id/park)
app.post("/api/Parkings", async (req, res) => {
  try {
    const { parkingLotId, registrationNumber, color } = req.body;

    // Input validations (same as before)

    const parkingLot = await ParkingLot.findOne({ id: parkingLotId }); // Use findById with _id field

    if (!parkingLot) {
      // Check if parking lot exists and is active
      return res.status(404).json({
        isSuccess: false,
        message: "Parking lot not found or inactive",
      });
    }

    if (parkingLot.availableSlots === 0) {
      return res.status(400).json({
        isSuccess: false,
        message: "Parking lot is full",
      });
    }

    const existingCar = parkingLot.parkedCars.find(
      (car) => car.registrationNumber === registrationNumber
    );
    if (existingCar) {
      return res.status(400).json({
        isSuccess: false,
        message: "Car with this registration number is already parked",
      });
    }

    let success = false;
    let newSlotNumber = 0;
    for (let i = 0; i < parkingLot.parkedCars.length; i++) {
      if (parkingLot.parkedCars[i].isActive === false) {
        parkingLot.parkedCars[i].isActive = true;
        parkingLot.parkedCars[i].registrationNumber = registrationNumber;
        parkingLot.parkedCars[i].color = color;
        parkingLot.parkedCars[i].entryTime = Date.now();
        parkingLot.availableSlots--;
        success = true;
        newSlotNumber = i + 1;
        break;
      }
    }

    if (!success) {
      throw new Error();
    }

    await parkingLot.save();

    res.status(201).json({
      isSuccess: true,
      response: {
        slotNumber: newSlotNumber,
        status: "PARKED", // Set status to "PARKED" as specified
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      isSuccess: false,
      message: "Error parking car",
    });
  }
});
app.delete("/api/Parkings", async (req, res) => {
  try {
    const { parkingLotId, registrationNumber } = req.body;

    if (!parkingLotId || !registrationNumber) {
      return res.status(400).json({
        isSuccess: false,
        message:
          'Missing required information. Please provide "parkingLotId" and "registrationNumber"',
      });
    }

    const parkingLot = await ParkingLot.findOne({ id: parkingLotId });
    if (!parkingLot) {
      // Check if parking lot exists and is active
      return res.status(404).json({
        isSuccess: false,
        message: "Parking lot not found or inactive",
      });
    }

    const parkedCarIndex = parkingLot.parkedCars.findIndex(
      (car) => car.registrationNumber === registrationNumber
    );
    if (parkedCarIndex === -1) {
      return res.status(404).json({
        isSuccess: false,
        message:
          "Car with this registration number not found in the parking lot",
      });
    }

    parkingLot.availableSlots++;
    parkingLot.parkedCars[parkedCarIndex] = {
      isActive: false,
      registrationNumber: "",
      color: "",
      slotNumber: parkedCarIndex,
      entryTime: Date.now(),
    };

    await parkingLot.save();

    res.status(200).json({
      isSuccess: true,
      response: {
        slotNumber: parkedCarIndex + 1,
        registrationNumber: registrationNumber,
        status: "LEFT", // Set status to "LEFT" as specified
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      isSuccess: false,
      message: "Error leaving car",
    });
  }
});

app.get("/api/Parkings", async (req, res) => {
  try {
    const { color, parkingLotId } = req.query;

    if (!color || !parkingLotId) {
      return res.status(400).json({
        isSuccess: false,
        message:
          'Missing required parameters. Please provide "color" and "parkingLotId"',
      });
    }

    const parkingLot = await ParkingLot.findOne({ id: parkingLotId });
    if (!parkingLot) {
      // Check if parking lot exists and is active
      return res.status(404).json({
        isSuccess: false,
        message: "Parking lot not found or inactive",
      });
    }

    const matchingCars = parkingLot.parkedCars.filter(
      (car) => car.color === color.toUpperCase() && car.slotNumber // Ensure parked cars
    );

    if (!matchingCars.length) {
      return res.status(404).json({
        isSuccess: false,
        message: "No cars found with this color in the parking lot",
      });
    }

    const response = matchingCars.map((car) => ({
      registrationNumber: car.registrationNumber,
      slotNumber: car.slotNumber,
      color: car.color,
      status: "LEFT", // Set status to "LEFT" as specified
    }));

    res.status(200).json({
      isSuccess: true,
      response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      isSuccess: false,
      message: "Error fetching car information",
    });
  }
});

// 5. Slot numbers for car with <colour> (GET /api/parking-lots/:id/slots?color=<color>)
app.get("/api/Slots", async (req, res) => {
  try {
    const { color, parkingLotId } = req.query;

    if (!color || !parkingLotId) {
      return res.status(400).json({
        isSuccess: false,
        error: {
          reason: "Missing required color or parkingLotId parameter",
        },
      });
    }

    const parkingLot = await ParkingLot.findOne({ id: parkingLotId });
    if (!parkingLot) {
      return res.status(404).json({
        isSuccess: false,
        error: {
          reason: "Parking lot not found or inactive",
        },
      });
    }

    const matchingCars = parkingLot.parkedCars
      .filter((car) => car.color === color.toUpperCase())
      .sort((a, b) => a.slotNumber - b.slotNumber); // Sort by slotNumber

    if (!matchingCars.length) {
      return res.status(200).json({
        isSuccess: false,
        error: {
          reason: `No car found with color ${color}`,
        },
      });
    }

    const slots = matchingCars.map((car) => ({
      color: car.color,
      slotNumber: car.slotNumber,
    }));

    res.status(200).json({
      isSuccess: true,
      response: {
        slots,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(200).json({
      // Respond with 200 for edge cases
      isSuccess: false,
      error: {
        reason: "Error fetching car information",
      },
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
