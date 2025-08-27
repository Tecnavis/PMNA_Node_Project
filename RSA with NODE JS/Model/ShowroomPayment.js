// models/ShowroomPayment.js
const mongoose = require('mongoose');

const ShowroomPaymentSchema = new mongoose.Schema({
  showroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Showroom',
    required: true
  },
  showroomName: {
    type: String,
    required: true
  },
  collectedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'cheque'],
    default: 'cash'
  },
  referenceNumber: String,
  remark: String,
 
  processedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  appliedAmounts: [Number],
  remainingAmount: {
    type: Number,
    default: 0
  },
  transactionStatus: {
    type: String,
    enum: ['COMPLETE', 'PARTIAL'],
    default: 'COMPLETE'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ShowroomPayment', ShowroomPaymentSchema);