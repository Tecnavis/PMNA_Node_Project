const mongoose = require('mongoose');

const showroomStaffSchema = new mongoose.Schema({
    designation: {
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: Number,
        required: true,
    },
    whatsappNumber: {
        type: Number,
        required: true,
    },
    rewardPoints: {
        type: Number,
        default: 0
    },
    showroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Showroom',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('ShowroomStaff', showroomStaffSchema);
