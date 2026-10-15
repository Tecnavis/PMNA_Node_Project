const mongoose = require("mongoose");
const { deleteStoredImage } = require("../services/mediaStorage");

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

// findByIdAndDelete() fires the "findOneAndDelete" hook ("findByIdAndDelete" is not a Mongoose hook,
// so the old cleanup never ran). Files are removed only after the record is actually deleted.
TaxInsuranceSchema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;
    await Promise.all([
        deleteStoredImage(doc.insurancePaperUrl),
        deleteStoredImage(doc.taxPaperUrl),
    ]); // best effort, never throws
});

const TaxInsurance = mongoose.model("TaxInsurance", TaxInsuranceSchema);

module.exports = TaxInsurance;
