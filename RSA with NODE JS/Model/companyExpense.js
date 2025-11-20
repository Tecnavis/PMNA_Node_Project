// In your Model/companyExpense.js
const mongoose = require('mongoose');

const companyExpenseSchema = new mongoose.Schema({
  expenseId: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  vendor: String,
  employee: String,
  image: String, // Changed from images array to single image string
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate expenseId before saving if not provided
companyExpenseSchema.pre('save', async function(next) {
  if (this.isNew && !this.expenseId) {
    const prefix = 'EXP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.expenseId = `${prefix}${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('CompanyExpense', companyExpenseSchema);