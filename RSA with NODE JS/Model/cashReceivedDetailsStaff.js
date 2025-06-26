const mongoose = require('mongoose');

const CashCollectionDetailsStaffSchema = new mongoose.Schema({
    balance: { type: String, required: true },
    currentCashInHand: { type: Number, required: true },
    totalStaffAmount: { type: Number, required: true },
  
    receivedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    givenAmountToStaff: { type: Number, required: true },
    remark: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CashCollectionDetailsStaff', CashCollectionDetailsStaffSchema);