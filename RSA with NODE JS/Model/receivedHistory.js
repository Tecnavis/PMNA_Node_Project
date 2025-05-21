const mongoose = require('mongoose');

const receivedHistorySchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Showroom', 'ShowroomStaff', 'Admin', 'Staff', "Driver"],
        required: true
    },
    receivedUser: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'receivedHistory.role',
        required: true
    },
    amount: {
        type: Number,
        default: 0
    }
}, { _id: false });

module.exports = receivedHistorySchema; 
