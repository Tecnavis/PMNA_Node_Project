const mongoose = require('mongoose');

/** The customer's 1–5 rating after drop-off (from the tracking link). One per booking. */
const customerRatingSchema = new mongoose.Schema(
    {
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, maxlength: 600 },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
        provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom' },
        reviewedAt: { type: Date },      // a manager looked at a low rating
        reviewedBy: { type: String },
        at: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
customerRatingSchema.index({ at: -1 });
customerRatingSchema.index({ rating: 1, reviewedAt: 1 });
customerRatingSchema.index({ driver: 1, at: -1 });

module.exports = mongoose.models.CustomerRating || mongoose.model('CustomerRating', customerRatingSchema);
