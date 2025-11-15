const mongoose = require('mongoose');

const settlementTransactionSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  settlementDate: {
    type: Date,
    required: true
  },
  totalSalary: {
    type: Number,
    default: 0
  },
  cashInHand: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  advance: {
    type: Number,
    default: 0
  },
  cashCollection: {
    type: Number,
    default: 0
  },
  pendingExpenses: {
    type: Number,
    default: 0
  },
  settlementAmount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better performance
settlementTransactionSchema.index({ driver: 1, settlementDate: -1 });
settlementTransactionSchema.index({ settlementDate: -1 });

module.exports = mongoose.model('SettlementTransaction', settlementTransactionSchema);