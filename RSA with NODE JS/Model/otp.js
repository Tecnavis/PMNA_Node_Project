const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

otpSchema.index({ phoneNumber: 1, otp: 1 });

module.exports = mongoose.model('Otp', otpSchema);
