const mongoose = require('mongoose');

const showroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  showroomId: { type: String, unique: true },
  description: { type: String },
  location: { type: String, required: true },
  latitudeAndLongitude: { type: String, required: true },
  username: { type: String },
  password: { type: String },
  helpline: { type: String },
  phone: { type: String, },
  mobile: { type: String },
  state: { type: String },
  district: { type: String },
  image: { type: String },
  rewardPoints: { type: Number, default: 0 },
  bookingPoints: { type: Number, default: 0 },
  bookingPointsForStaff: { type: Number, default: 0 },
  showroomLink: { type: String },
  cashInHand: { type: Number },
  services: {
    serviceCenter: {
      selected: { type: Boolean, default: false },
      amount: { type: Number, default: null }
    },
    bodyShop: {
      selected: { type: Boolean, default: false },
      amount: { type: Number, default: null }
    },
    showroom: {
      selected: { type: Boolean, default: false }
    }
  }
});

module.exports = mongoose.model('Showroom', showroomSchema);