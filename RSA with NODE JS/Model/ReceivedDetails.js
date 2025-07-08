const mongoose = require('mongoose')

const ReceivedDetailsSchema = new mongoose.Schema({
    amount: { type: String, required: true },
    remark: { type: String, required: true },
    fileNumber: { type: String, required: true },
    balance: { type: String, required: true },
    currentNetAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    givenAmountByStaff: { type: Number, default: 0 },

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
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
    },
    receivedAmount: { type: Number, required: true },
}, { timestamps: true });

const ReceivedDetails = mongoose.model('ReceivedDetails', ReceivedDetailsSchema);

module.exports = ReceivedDetails;
