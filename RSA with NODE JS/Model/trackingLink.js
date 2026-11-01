const mongoose = require('mongoose');

/** A private link the customer / showroom opens to follow one case live (no rates, no other cases). */
const trackingLinkSchema = new mongoose.Schema(
    {
        token: { type: String, required: true, unique: true },
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
        show: {
            map: { type: Boolean, default: true },     // live map + ETA
            driver: { type: Boolean, default: false }, // driver name and phone (off by default for driver privacy)
        },
        expiry: { type: String, enum: ['after-delivery', 'hours'], default: 'after-delivery' },
        expiresAt: { type: Date },                      // only for expiry = 'hours'
        afterDeliveryHours: { type: Number, default: 24 },
        revokedAt: { type: Date },
        createdBy: { role: String, id: String, name: String },
        sentTo: [{ name: String, phone: String, channel: String, at: { type: Date, default: Date.now } }],
        views: { type: Number, default: 0 },
        lastViewedAt: { type: Date },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.TrackingLink || mongoose.model('TrackingLink', trackingLinkSchema);
