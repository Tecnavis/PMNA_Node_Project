const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  companyName: {
    type: String,
    trim: true,
  },
  baseLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BaseLocation',
    required: true,
  },
  idNumber: {
    type: String,
    unique: true,
  },
  creditAmountLimit: {
    type: Number,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  personalPhoneNumber: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  cashInHand: {
    type: Number, 
  },
  driverSalary: {
    type: Number, 
  },
  serviceDetails: [
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
      }
    },
  ],
  image: {
    type: String, // URL or path to the image
  },
});

module.exports = mongoose.model('Provider', providerSchema);
