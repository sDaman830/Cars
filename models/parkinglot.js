const mongoose = require("mongoose");

const parkingLotSchema = new mongoose.Schema({
  capacity: { type: Number, required: true },
  availableSlots: {
    type: Number,
    default: function () {
      return this.capacity;
    },
  },
  parkedCars: {
    type: [
      {
        isActive: { type: Boolean, default: false },
        registrationNumber: { type: String, unique: true },
        color: { type: String },
        slotNumber: { type: Number },
        entryTime: { type: Date, default: Date.now },
      },
    ],
    default: function () {
      return Array.from({ length: this.capacity }).map((_, i) => ({
        isActive: false,
        registrationNumber: "",
        color: "",
        slotNumber: i,
        entryTime: Date.now(),
      }));
    },
  },
  id: { type: String, unique: true }, // Optional unique identifier
});

module.exports = mongoose.model("ParkingLot", parkingLotSchema);
