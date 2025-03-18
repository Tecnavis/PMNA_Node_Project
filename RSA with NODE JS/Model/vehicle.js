// models/vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicleName: {
        type: String,
        required: true,
        trim: true,
    },
    serviceKM: {
        type: Number,
        required: true,
        default: 0
    },
    serviceVehicle: {
        type: String,
        required: true,
        trim: true,
    },
    totalOdometer: {
        type: Number,
        default: 0
    },
    vehicleServiceDismissed: {
        type: Boolean,
        default: false
    },
    vehicleServiceDue: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
