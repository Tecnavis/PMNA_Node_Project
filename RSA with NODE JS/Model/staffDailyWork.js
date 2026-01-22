// models/StaffDailyWork.js
const mongoose = require('mongoose');

const staffDailyWorkSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffType: {
    type: String,
    enum: ['accountant', 'operations', 'coordinator', 'showroom']
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  works: [{
    taskName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'delayed'],
      default: 'pending'
    },
    count: { type: Number, default: 0 },
    time: String,
    startTime: Date,
    endTime: Date,
    remarks: String,
    priority: Number
  }],
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  pendingTasks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
staffDailyWorkSchema.index({ staff: 1, date: 1 }, { unique: true });
staffDailyWorkSchema.index({ date: 1, staffType: 1 });

module.exports = mongoose.model('StaffDailyWork', staffDailyWorkSchema);