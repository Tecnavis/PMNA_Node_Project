const mongoose = require('mongoose')

const ReceivedDetailsSchema = new mongoose.Schema({
    amount: { type: String, required: true },
    remark: { type: String, required: true },
    fileNumber: { type: String, required: true },
    balance: { type: String, required: true },
    currentNetAmount: { type: Number, required: true },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    receivedAmount: { type: Number, required: true },
}, { timestamps: true });

const ReceivedDetails = mongoose.model('ReceivedDetails', ReceivedDetailsSchema);

module.exports = ReceivedDetails;
