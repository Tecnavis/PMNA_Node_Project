const mongoose = require('mongoose');

/**
 * Case activity log: one row per thing that happened to a booking (status change, driver
 * assigned, tracking link shared, reassignment approved …), with who did it.
 * Written in the background; a failed write never affects the booking itself.
 */
const bookingEventSchema = new mongoose.Schema(
    {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
        type: { type: String, required: true }, // created | status | assigned | tracking-shared | tracking-revoked | reassign-approved | note
        from: { type: String },
        to: { type: String },
        by: {
            role: { type: String },
            id: { type: String },
            name: { type: String },
        },
        meta: { type: mongoose.Schema.Types.Mixed },
        at: { type: Date, default: Date.now, index: true },
    },
    { versionKey: false }
);
bookingEventSchema.index({ booking: 1, at: 1 });

module.exports = mongoose.models.BookingEvent || mongoose.model('BookingEvent', bookingEventSchema);
