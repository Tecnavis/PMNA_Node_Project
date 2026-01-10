// models/staffWorkAssignment.js
const mongoose = require('mongoose');

const staffWorkAssignmentSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  dailyTasks: [{
    taskName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['routine', 'special', 'emergency'],
      default: 'routine',
    },
    estimatedTime: {
      type: String, // e.g., "30 mins", "1 hour"
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('StaffWorkAssignment', staffWorkAssignmentSchema);