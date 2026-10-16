const mongoose = require('mongoose');

/** Small key/value settings (e.g. the TV screen passcode). */
const appSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('AppSetting', appSettingSchema);
