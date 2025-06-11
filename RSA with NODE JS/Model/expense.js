const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    approve: {
        type: Boolean,

    },
    approvedDate: {
        type: Date
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    image: {
        type: String,
        required: true,
    },
    status: { // Recommended additional field
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {

    timestamps: true
});
expenseSchema.index({ driver: 1, approve: 1 });
expenseSchema.index({ status: 1 });
module.exports = mongoose.model('Expense', expenseSchema);
