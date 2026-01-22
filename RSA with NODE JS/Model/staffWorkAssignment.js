// models/StaffWorkAssignment.js
const mongoose = require('mongoose');

const staffWorkAssignmentSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffType: {
    type: String,
    enum: ['accountant', 'operations', 'coordinator', 'showroom'],
    required: true
  },
  dailyTasks: [{
    taskName: { type: String, required: true },
    description: String,
    estimatedTime: String, // e.g., "10:00 AM", "2 hours"
    priority: { type: Number, default: 3 },
    requiresCount: { type: Boolean, default: false },
    requiresTimeTracking: { type: Boolean, default: false }
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StaffWorkAssignment', staffWorkAssignmentSchema);