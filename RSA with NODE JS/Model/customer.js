const mongoose = require('mongoose');

/** Customers who book through the RSA app or WhatsApp. */
const customerSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, index: true }, // 10 digits, India
    name: { type: String, trim: true, maxlength: 80 },
    vehicles: [{
        _id: false,
        number: { type: String, trim: true, uppercase: true, maxlength: 20 },
        brand: { type: String, trim: true, maxlength: 40 },
        model: { type: String, trim: true, maxlength: 40 },
        type: { type: String, trim: true, maxlength: 30 }, // Car / SUV / Bike / Heavy
    }],
    lastLoginAt: { type: Date },
    blocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
