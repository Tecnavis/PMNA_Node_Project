// models/serviceType.model.js
const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    required: true,
    trim: true,
  },
  firstKilometer: {
    type: Number,
    required: true,
  },
  additionalAmount: {
    type: Number,
    required: true,
  },
  firstKilometerAmount: {
    type: Number,
    required: true,
  },
  expensePerKm: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('ServiceType', serviceTypeSchema);
