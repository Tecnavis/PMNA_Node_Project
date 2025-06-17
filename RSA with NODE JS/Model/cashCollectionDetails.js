const mongoose = require('mongoose');

const CashCollectionDetailsSchema = new mongoose.Schema({
    fileNumbers: { type: [String], required: true }, // Fixed array definition
    balance: { type: String, required: true },
    currentCashInHand: { type: Number, required: true },
    totalDriverAmount: { type: Number, required: true },
    receivedUser: {
        type: String,
        enum: ['Admin', 'Staff'],
        required: true
    },
    receivedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    receivedAmount: { type: Number, required: true },
    remark: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CashCollectionDetails', CashCollectionDetailsSchema);