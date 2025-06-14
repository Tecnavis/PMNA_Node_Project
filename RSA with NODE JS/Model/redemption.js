const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
    reward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
        required: true,
    },
    user: {
        type: String,
        required: true,
        refPath: 'bookedByModel'
    },
    redeemByModel: {
        type: String,
        enum: ['Showroom', 'ShowroomStaff', 'Staff', "Driver"]
    },
    approval: {
        type: Boolean,
        default: false
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
    }
}, { timestamps: true });

const Redemption = mongoose.model('Redemption', redemptionSchema);

module.exports = Redemption
