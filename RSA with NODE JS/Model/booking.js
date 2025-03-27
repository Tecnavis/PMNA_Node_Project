const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    workType: { type: String },
    fileNumber: { type: String },
    location: { type: String },
    latitudeAndLongitude: { type: String },
    baselocation: { type: mongoose.Schema.Types.ObjectId, ref: 'BaseLocation' },
    showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    totalDistence: { type: Number },
    dropoffLocation: { type: String },
    dropoffLatitudeAndLongitude: { type: String },
    trapedLocation: { type: String },
    serviceType: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' },
    customerName: { type: String },
    serviceCategory: { type: String },
    mob1: { type: String },
    mob2: { type: String },
    vehicleType: { type: String },
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
    vehicleNumber: { type: String },
    driverSalaryCheck: { type: Boolean },
    compnayAmountCheck: { type: Boolean },
    remark: { type: String },
    totalPoints: { type: Number },
    serviceVehicleNumber: { type: String },
    pickupImages: { type: [String], default: [] },
    dropoffImages: { type: [String], default: [] },
    feedback: [
        {
            questionId: { type: String },
            response: { type: String, enum: ["yes", "no"] },
            yesPoint: { type: Number },
            noPoint: { type: Number }
        }
    ],
    verified: { type: Boolean },
    feedbackCheck: { type: Boolean },
    accountantVerified: { type: Boolean },
    cashPending: { type: Boolean, default: false },// New props
    approve: { type: Boolean, default: false },// New props
    receivedUser: { type: String }, // New props
    notes: { type: mongoose.Schema.Types.ObjectId, ref: 'Notes' } // New props

}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);