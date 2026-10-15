// In your routes/companyExpenses.js
const express = require('express');
const router = express.Router();
const controller = require('../Controller/companyExpenseController');
const jwt = require('../Middileware/jwt');
const upload = require('../config/multer');
const { bookingPhotos, dated, profile, vehiclePapers, reward, adminQr } = require('../config/mediaPlacement');

// Create new company expense - FIXED: Use controller.createCompanyExpense
router.post('/', jwt, upload.single('image', dated('company-expenses', 'company-expense')), controller.createCompanyExpense);

// Get all company expenses with filters and pagination
router.get('/', jwt, controller.getCompanyExpenses);

// Get company expense by ID
router.get('/:id', jwt, controller.getCompanyExpenseById);

// Update company expense - FIXED: Changed to single image upload
router.put('/:id', jwt, upload.single('image', dated('company-expenses', 'company-expense')), controller.updateCompanyExpense);

// Approve/Reject company expense
router.patch('/:id/status', jwt, controller.updateExpenseStatus);

// Delete company expense
router.delete('/:id', jwt, controller.deleteCompanyExpense);

// Get expense statistics
router.get('/stats/summary', jwt, controller.getExpenseStats);

// Upload single image route (if needed)
router.post('/upload', jwt, upload.single('image', dated('company-expenses', 'company-expense')), controller.uploadImage);

module.exports = router;