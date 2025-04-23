const mongoose = require('mongoose');

const baseLocationSchema = new mongoose.Schema({
  baseLocation: {
    type: String,
    required: true,
    trim: true,
  },
  latitudeAndLongitude: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('BaseLocation', baseLocationSchema);
