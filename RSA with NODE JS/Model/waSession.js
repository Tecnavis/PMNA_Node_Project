const mongoose = require('mongoose');

/** WhatsApp booking conversation state, one per phone. Removed automatically after 24 h of silence. */
const waSessionSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    step: { type: String, default: 'start' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastMessageId: { type: String },
    updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

module.exports = mongoose.model('WaSession', waSessionSchema);
