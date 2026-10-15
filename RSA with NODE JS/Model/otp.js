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
    },
    attempts: {               // wrong guesses for the current code
        type: Number,
        default: 0,
    }
}, {
    timestamps: true
});

otpSchema.index({ phoneNumber: 1, otp: 1 });

module.exports = mongoose.model('Otp', otpSchema);
