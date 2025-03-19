const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    workType: { type: String, required: true }, 
    fileNumber: { type: String, required: true },
    location: { type: String, required: true },
    latitudeAndLongitude: { type: String, required: true },
    baselocation: { type: mongoose.Schema.Types.ObjectId, ref: 'BaseLocation', required: true },
    showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false },
    totalDistence: { type: Number, required: true },
    dropoffLocation: { type: String, required: true },
    dropoffLatitudeAndLongitude: { type: String, required: true },
    trapedLocation: { type: String, required: true },
    serviceType: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType', required: true },
    customerName: { type: String, required: true },
    serviceCategory: { type: String },
    mob1: { type: String, required: true },
    mob2: { type: String },
    vehicleType: { type: String, required: true },
    brandName: { type: String },
    comments: { type: String },
    customerVehicleNumber: { type: String },
    status: { type: String },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    afterExpenseForProvider: { type: Number },
    afterExpenseForDriver: { type: Number },
    payableAmountForProvider: { type: Number },
    payableAmountForDriver: { type: Number },
    totalAmount: { type: Number },
    receivedAmount: { type: Number, default: 0 },
    totalDriverDistence: { type: Number },
    driverSalary: { type: Number },
    accidentOption: { type: String },
    insuranceAmount: { type: Number },
    adjustmentValue: { type: Number },
    amountWithoutInsurance: { type: Number },
    createdBy: { type: String },
    bookedBy: { type: String },
    pickupDate: { type: Date },
    pickupTime: { type: Date },
    dropoffTime: { type: Date },
    driverSalaryCheck: { type: Boolean },
    compnayAmountCheck: { type: Boolean },
    remark: { type: String },
    totalPoints: { type: Number },
    serviceVehicleNumber: { type: String },
    pickupImages: { type: [String], default: [] },
    dropoffImages: { type: [String], default: [] },
    feedback: [
        {
            questionId: { type: String, required: true },
            response: { type: String, enum: ["yes", "no"], required: true },
            yesPoint: { type: Number, required: true },
            noPoint: { type: Number, required: true }
        }
    ],
    verified: { type: Boolean },
    feedbackCheck: { type: Boolean },
    accountantVerified: { type: Boolean },
    cashPending: { type: Boolean, default: false },// New props
    receivedUser: { type: String } // New props

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);