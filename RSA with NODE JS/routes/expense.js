const express = require('express');
const expenseController = require('../Controller/expense');
const router = express.Router();
const jwt = require('../Middileware/jwt')
const upload = require('../config/multer');


router.get('/', jwt, expenseController.getAllExpense);
router.get('/pending', jwt, expenseController.getAllPendingExpense);
router.patch('/:id', jwt, upload.single('image'), expenseController.udpateExpense)
router.post('/:id', jwt, upload.single('image'), expenseController.createExpense)
router.patch('/update-expense/:id', jwt, expenseController.approve);
router.get('/get-expense/:id', jwt, expenseController.getExpenseById)
router.get('/driver-expense/:id', jwt, expenseController.getAllExpenseForDriver)
// POST routes
router.post('/', jwt, upload.single('image'), expenseController.createExpense); // Create new expense
router.post('/:id', jwt, upload.single('image'), expenseController.createExpenseForDriver); // Create for specific driver

// PATCH routes (FIXED: Remove duplicate route)
router.patch('/:id', jwt, upload.single('image'), expenseController.updateExpense); // Update expense
router.patch('/update-expense/:id', jwt, expenseController.approve); // Approve expense
router.patch('/complete-settlement/:driverId', jwt, expenseController.completeSettlement);

// DELETE route
router.delete('/:id', jwt, expenseController.deleteExpense); // Delete expense

module.exports = router;
