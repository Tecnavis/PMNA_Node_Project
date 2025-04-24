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
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    image: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
