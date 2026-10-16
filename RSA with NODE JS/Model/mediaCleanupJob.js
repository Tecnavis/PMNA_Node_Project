const mongoose = require('mongoose');

/** Record of each bulk photo delete (who, what, how many) — kept for audit. */
const mediaCleanupJobSchema = new mongoose.Schema({
    status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
    filter: {
        company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
        companyName: String,
        from: String,
        to: String,
        kinds: [String],
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId },
    requestedByName: String,
    bookings: { type: Number, default: 0 },
    bookingsDone: { type: Number, default: 0 },
    imagesFound: { type: Number, default: 0 },
    imagesDeleted: { type: Number, default: 0 },
    imagesFailed: { type: Number, default: 0 },
    imagesSkipped: { type: Number, default: 0 },
    error: String,
    finishedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('MediaCleanupJob', mediaCleanupJobSchema);
