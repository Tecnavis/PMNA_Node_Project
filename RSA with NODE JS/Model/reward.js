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
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  pointsRequired: {
    type: Number,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
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
