const mongoose = require('mongoose');

/** Every admin-website login attempt (admin + staff), kept for a year. Passwords are never stored. */
const loginEventSchema = new mongoose.Schema(
    {
        kind: { type: String, enum: ['admin', 'staff'], required: true },
        userId: { type: String },
        name: { type: String },
        login: { type: String }, // email / user name typed
        success: { type: Boolean, required: true },
        reason: { type: String }, // wrong-password | unknown-user | otp-sent | otp-wrong | ok
        ip: { type: String },
        device: { type: String },
        at: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
loginEventSchema.index({ at: -1 });
loginEventSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
loginEventSchema.index({ userId: 1, at: -1 });

module.exports = mongoose.models.LoginEvent || mongoose.model('LoginEvent', loginEventSchema);
