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
     settled: { // New field to track settlement status
        type: Boolean,
        default: false
    },
    settledAt: { // New field to track when it was settled
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
