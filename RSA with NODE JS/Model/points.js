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
    // driver: per verified case they drove (on top of points from customer feedback)
    driverBookingPoint: { type: Number, default: 0 },
    // marketing executive: per verified booking from a showroom they added, and per monthly visit
    executiveBookingPoint: { type: Number, default: 0 },
    executiveVisitPoint: { type: Number, default: 0 },
});

module.exports = mongoose.model('Points', PointsSchema);
