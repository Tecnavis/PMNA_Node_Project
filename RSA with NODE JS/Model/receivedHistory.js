const mongoose = require('mongoose');

const receivedHistorySchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Showroom', 'ShowroomStaff', 'Admin', 'Staff', 'Driver', 'UPI'], // Add 'UPI' here
        required: true
    },
    receivedUser: {
        type: mongoose.Schema.Types.Mixed, // Change to Mixed to accept both ObjectId and string
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    paymentMethod: { // Add optional field to track payment method
        type: String,
        enum: ['Cash', 'UPI', 'Card'],
        default: 'Cash'
    }
}, { _id: false });

module.exports = receivedHistorySchema; 
