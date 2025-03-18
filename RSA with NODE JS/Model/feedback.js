const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  yesPoint: {
    type: Number,
    required: true,
  },
  noPoint: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
