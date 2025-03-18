const mongoose = require('mongoose');

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
    required: true,
  },
  image: {
    type: String, // URL or path to the uploaded image
  },
}, { timestamps: true });

module.exports = mongoose.model('Reward', rewardSchema);
