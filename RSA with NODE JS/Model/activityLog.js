const mongoose = require('mongoose');

/** What admin-website users changed (one row per saving request). Request bodies are not stored. */
const activityLogSchema = new mongoose.Schema(
    {
        actor: { role: String, id: String, name: String },
        method: { type: String },
        path: { type: String },
        action: { type: String },   // readable, e.g. "Cancelled a booking"
        category: { type: String }, // booking | money | people | settings | delete | other
        targetId: { type: String },
        status: { type: Number },
        ok: { type: Boolean },
        ip: { type: String },
        device: { type: String },
        at: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
activityLogSchema.index({ at: -1 });
activityLogSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
activityLogSchema.index({ 'actor.id': 1, at: -1 });
activityLogSchema.index({ category: 1, at: -1 });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
