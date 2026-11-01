const mongoose = require('mongoose');

/** One row per backup attempt (automatic or "Back up now"). */
const backupRunSchema = new mongoose.Schema(
    {
        set: String,
        reason: String,
        ok: Boolean,
        error: String,
        files: Number,
        bytes: Number,
        seconds: Number,
        by: String,
        at: { type: Date, default: Date.now },
    },
    { versionKey: false }
);
backupRunSchema.index({ at: -1 });

module.exports = mongoose.models.BackupRun || mongoose.model('BackupRun', backupRunSchema);
