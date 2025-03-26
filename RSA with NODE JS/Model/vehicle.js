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
    DismissedBy: {
        type: String,
        default: null
    },
    vehicleServiceDue: {
        type: Boolean,
        default: false
    },
    previousOdometer: {
        type: Number,
        default: 0
    },
    valid :{
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
