const mongoose = require('mongoose');

const salaryTransactionSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true

  },
  userModel: {
    type: String,
    enum: ["Driver", 'Provider']
  },
  transactionId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  }
},{timestamps : true});

module.exports = mongoose.model('SalaryTransaction', salaryTransactionSchema)