// models/driver.model.js
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  idNumber: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  personalPhoneNumber: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String, // Path to the uploaded image
  },
  rewardPoints: {
    type: Number,
  },
  cashInHand: {
    type: Number,
    default: 0
  },
  advance: {
    type: Number,
    default: 0
  },
  driverSalary: {
    type: Number,
  },
  vehicle: [
    {
      serviceType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceType',
        required: true,
      },
      basicAmount: {
        type: Number,
        required: true,
      },
      kmForBasicAmount: {
        type: Number,
        required: true,
      },
      overRideCharge: {
        type: Number,
        required: true,
      },
      vehicleNumber: {
        type: String,
        trim: true,
      },
    },
  ],
  currentLocation: {
    type: String,
    trim: true,
  },
  currentBookingStatus: {
    type: String,
  },
  fcmToken: {
    type: String
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  dieselExpense: {
    type: Number,
    default: 0
  },
  expense: {
    type: Number,
    default: 0
  },
  totalExpense: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Driver', driverSchema);
