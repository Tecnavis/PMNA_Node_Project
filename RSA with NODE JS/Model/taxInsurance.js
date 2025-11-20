const mongoose = require("mongoose");
const { deleteCloudinaryImage } = require("../config/multer");

const TaxInsuranceSchema = new mongoose.Schema({
    emiDuedismissedBy: {
        type: String,
        default: null
    },
    emiDue: {
        type: Boolean,
        default: false
    },
    emiExpiryDate: {
        type: Date,
        required: true
    },
    insuranceDue: {
        type: Boolean,
        default: false
    },
    insuranceDueDismissed: {
        type: Boolean,
        default: false
    },
    insuranceExpiryDate: {
        type: Date,
        required: true
    },
    insurancePaperUrl: {
        type: String,
        required: true
    },
    insuranceDueDismissedBy: {
        type: String,
        default: null
    },
    pollutionDue: {
        type: Boolean,
        default: false
    },
    pollutionDueDismissed: {
        type: Boolean,
        default: false
    },
    pollutionDueDismissedBy: {
        type: String,
        default: null
    },
    pollutionExpiryDate: {
        type: Date,
        required: true
    },
    taxDue: {
        type: Boolean,
        default: false
    },
    taxDueDismissed: {
        type: Boolean,
        default: false
    },
    taxExpiryDate: {
        type: Date,
        required: true
    },
    taxPaperUrl: {
        type: String,
        required: true
    },
    taxDueDismissedBy: {
        type: String,
        default: null
    },
    // PERMIT FEIDS
    permitDue: {
        type: Boolean,
        default: false
    },
    permitDueDismissed: {
        type: Boolean,
        default: false
    },
    permitDueDismissedBy: {
        type: String,
        default: null
    },
    permitExpiryDate: {
        type: Date,
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, { timestamps: true });

TaxInsuranceSchema.pre("findByIdAndDelete", async function (next) {
    try {
        const doc = await this.model.findOne(this.getFilter());
        if (!doc) return next();

        // Delete related Cloudinary images
        await deleteCloudinaryImage(doc.insurancePaperUrl);
        await deleteCloudinaryImage(doc.taxPaperUrl);

        next();
    } catch (err) {
        console.error("Error during file cleanup:", err);
        next(err);
    }
});

const TaxInsurance = mongoose.model("TaxInsurance", TaxInsuranceSchema);

module.exports = TaxInsurance;
