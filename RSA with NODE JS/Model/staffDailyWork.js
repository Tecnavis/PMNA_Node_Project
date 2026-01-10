// models/staffDailyWork.js
const mongoose = require('mongoose');

const staffDailyWorkSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  works: [{
    taskName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    remarks: {
      type: String,
    }
  }],
  overallStatus: {
    type: String,
    enum: ['pending', 'partially-completed', 'completed'],
    default: 'pending',
  },
  completedPercentage: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Index for efficient querying
staffDailyWorkSchema.index({ staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StaffDailyWork', staffDailyWorkSchema);