const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
        index: true,
    },
    checkInLocation: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
    },
    checkIn: {
        type: Date,
        default: Date.now,
    },
    checkOut: {
        type: Date,
        validate: {
            validator: function (value) {
                return !this.checkIn || value > this.checkIn;
            },
            message: "Check-out time must be after check-in time",
        },
    },
    checkOutLocation: {
        type: String,
        trim: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('Attendance', AttendanceSchema)