// models/staff.js
const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    trim: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  cashInHand: {
    type: Number, 
  },
  bookingPoint: {
    type: Number, 
    default: 0, 
  },
  rewardPoints: {
    type: Number, 
    default: 0, 
  },
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);
