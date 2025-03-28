const mongoose = require('mongoose')

const AdvanceSchema = new mongoose.Schema({
    addedAdvance: {
        type: Number,
        required: true,
        default: 0
    },
    advance: {
        type: Number,
        required: true,
        default: 0
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    type: {
        type: String,
        required: true
    },
    remark: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Advance', AdvanceSchema);