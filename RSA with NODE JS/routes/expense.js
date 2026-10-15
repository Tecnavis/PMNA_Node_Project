const express = require('express');
const expenseController = require('../Controller/expense');
const router = express.Router();
const jwt = require('../Middileware/jwt')
const upload = require('../config/multer');
const { bookingPhotos, dated, profile, vehiclePapers, reward, adminQr } = require('../config/mediaPlacement');


router.get('/', jwt, expenseController.getAllExpense);
router.get('/pending', jwt, expenseController.getAllPendingExpense);
router.patch('/:id', jwt, upload.single('image', dated('expenses', 'expense')), expenseController.udpateExpense)
router.post('/:id', jwt, upload.single('image', dated('expenses', 'expense')), expenseController.createExpense)
router.patch('/update-expense/:id', jwt, expenseController.approve);
router.get('/get-expense/:id', jwt, expenseController.getExpenseById)
router.get('/driver-expense/:id', jwt, expenseController.getAllExpenseForDriver)
// NOTE: duplicate POST /:id, PATCH /:id and PATCH /update-expense/:id lines were removed —
// Express always used the first definitions above, so behaviour is unchanged.
// POST routes
router.post('/', jwt, upload.single('image', dated('expenses', 'expense')), expenseController.createExpense); // Create new expense

// PATCH routes (FIXED: Remove duplicate route)
router.patch('/complete-settlement/:driverId', jwt, expenseController.completeSettlement);

// DELETE route
router.delete('/:id', jwt, expenseController.deleteExpense); // Delete expense

module.exports = router;
