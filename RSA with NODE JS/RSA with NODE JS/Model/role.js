const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,  // Automatically trims whitespace
  },
});

module.exports = mongoose.model('Role', roleSchema);
