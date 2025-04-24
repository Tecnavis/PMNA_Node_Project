const mongoose = require('mongoose');

const dieselExpenseSchema = new mongoose.Schema({
    expenseId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    description: {
        type: String,
        trim: true,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be positive']
    },
    images: {
        type: [String],
        validate: {
            validator: function (arr) {
                return arr.length >= 2 && arr.length <= 3;
            },
            message: 'You must upload 2 to 3 images'
        },
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DieselExpense', dieselExpenseSchema);
