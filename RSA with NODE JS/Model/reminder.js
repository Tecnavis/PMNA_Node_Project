const mongoose = require('mongoose');

/**
 * Reminders for admin-site users (Admin / Staff). A staff member sees reminders they created
 * or that were assigned to them; admins see everyone's.
 */
const reminderSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 2000 },
    dueAt: { type: Date, required: true, index: true },
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    // optional link to a case
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    fileNumber: { type: String, trim: true },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, index: true },   // Staff or Admin id
    assignedToName: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    createdByName: { type: String },
    createdByRole: { type: String },

    done: { type: Boolean, default: false, index: true },
    doneAt: { type: Date },
    doneByName: { type: String },
}, { timestamps: true });

reminderSchema.index({ done: 1, dueAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
