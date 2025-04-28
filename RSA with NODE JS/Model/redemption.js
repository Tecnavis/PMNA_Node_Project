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
}, { timestamps: true });

const Redemption = mongoose.model('Redemption', redemptionSchema);

module.exports = Redemption
