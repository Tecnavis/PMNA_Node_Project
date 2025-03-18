// models/Company.js
const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
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
});

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  cashInHand: {
    type: Number, 
  },
  vehicle: {
    type: [VehicleSchema],
    required: true,
  },
  idNumber: {type: String},
  creditLimitAmount: {type: Number},
  personalPhoneNumber: {type: String},
  image: {type: String}, // To store the path of the uploaded image
}, {
  timestamps: true,
});

module.exports = mongoose.model('Company', CompanySchema);
