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

// Never send passwords in API responses (login reads the document directly, so it still works)
const hidePassword = (doc, ret) => { delete ret.password; return ret; };
staffSchema.set('toJSON', { transform: hidePassword });
staffSchema.set('toObject', { transform: hidePassword });

module.exports = mongoose.model('Staff', staffSchema);
