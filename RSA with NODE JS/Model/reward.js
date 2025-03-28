const mongoose = require('mongoose');

const RewardFor = {
  Staff: "Staff",
  Showroom: "Showroom",
  ShowroomStaff: "ShowroomStaff",
  Driver: "Driver"
};

const rewardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  pointsRequired: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  TotalRedeem: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
  },
  rewardFor: {
    type: String,
    enum: Object.values(RewardFor),
    required: true,
  },
  image: {
    type: String,
  },
}, { timestamps: true });

const Reward = mongoose.model('Reward', rewardSchema);

module.exports = {
  Reward,
  RewardFor
};
