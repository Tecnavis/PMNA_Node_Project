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
  },
  advance: {
    type: Number, 
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
});

module.exports = mongoose.model('Driver', driverSchema);
