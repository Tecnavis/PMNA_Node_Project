const mongoose = require('mongoose');

const PointsSchema = new mongoose.Schema({
    bookingPoint: {
        type: Number,
        default: 0
    },
    showRoomStaffBookingPoint: {
        type: Number,
        default: 0
    },
    showRoomBookingPoint: {
        type: Number,
        default: 0
    },
});

module.exports = mongoose.model('Points', PointsSchema);
