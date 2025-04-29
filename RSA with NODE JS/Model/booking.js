const mongoose = require('mongoose');
const visibleFilter = require('../plugins/visibleFilter');

const bookingSchema = new mongoose.Schema({
    workType: { type: String },
    fileNumber: { type: String, unique: true },
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
    status: { type: String, default: 'Booking Added' },
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
    transferedSalary: { type: Number },
    accidentOption: { type: String },
    insuranceAmount: { type: Number },
    adjustmentValue: { type: Number },
    amountWithoutInsurance: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'bookedByModel' },
    bookedByModel: {
        type: String,
        enum: ['Showroom', 'ShowroomStaff', 'Admin', 'Staff']
    },
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
    cashPending: { type: Boolean },// New props
    approve: { type: Boolean, default: false },// New props
    receivedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // New props
    dummyDriverName: { type: String }, // New props
    dummyProviderName: { type: String }, // New props
    bookingStatus: { type: String }, // New props
    companyName: { type: String }, // New props
    pickupImagePending: { type: Boolean },
    dropoffImagePending: { type: Boolean },
    cancelStatus: { type: Boolean }, // New props
    cancelReason: { type: String }, // New props
    cancelKm: { type: Number }, // New props
    invoiceNumber: { type: String }, // New props
    pickupDistence: { type: String }, // New props
    invoiceStatus: { type: Boolean }, // New props
    cancelImage: {
        type: String, // Path to the uploaded image
    },
    notes: { type: mongoose.Schema.Types.ObjectId, ref: 'Notes' } // New props

}, { timestamps: true });

bookingSchema.plugin(visibleFilter);

module.exports = mongoose.model('Booking', bookingSchema);