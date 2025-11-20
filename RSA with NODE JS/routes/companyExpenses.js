// In your routes/companyExpenses.js
const express = require('express');
const router = express.Router();
const controller = require('../Controller/companyExpenseController');
const jwt = require('../Middileware/jwt');
const upload = require('../config/multer');

// Create new company expense - FIXED: Use controller.createCompanyExpense
router.post('/', upload.single('image'), controller.createCompanyExpense);

// Get all company expenses with filters and pagination
router.get('/', jwt, controller.getCompanyExpenses);

// Get company expense by ID
router.get('/:id', jwt, controller.getCompanyExpenseById);

// Update company expense - FIXED: Changed to single image upload
router.put('/:id', jwt, upload.single('image'), controller.updateCompanyExpense);

// Approve/Reject company expense
router.patch('/:id/status', jwt, controller.updateExpenseStatus);

// Delete company expense
router.delete('/:id', jwt, controller.deleteCompanyExpense);

// Get expense statistics
router.get('/stats/summary', jwt, controller.getExpenseStats);

// Upload single image route (if needed)
router.post('/upload', jwt, upload.single('image'), controller.uploadImage);

module.exports = router;