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
    default: 0
  },
  driverSalary: {
    type: Number,
  },
   totalAdvance: {
    type: Number,
  },
   totalSalary: {
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
  fcmToken: {
    type: String
  },
  currentLocation: {
    type: String,
    trim: true,
  },
  currentBookingStatus: {
    type: String,
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  advance: {
    type: Number,
    default: 0
  },
  settlement: {
    type: Boolean,
    default: false
  },
  isFullSettlement : {
    type: Boolean,
    default: false
  },
  settlementCompletedDate: {
    type: Date
  },
  previousSettlementCompletedDate: {
    type: Date
  },
  lastSettlementAmount: {
    type: Number
  },
   lastVehicleNumber: String,
  lastServiceType: String,
  lastBookingStatus: String,
  pendingExpensesCount: {
    type: Number,
    default: 0
  },
   totalTransferedAmount: {
    type: Number,
    default: 0
  },
  
  totalPendingAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Provider', providerSchema);
