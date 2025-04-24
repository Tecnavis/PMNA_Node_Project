const express = require('express');
const router = express.Router();
const dieselExpenseController = require('../Controller/dieselExpense');
const imageUpload = require('../config/multer')
const jwt = require('../Middileware/jwt')




// GET /diesel-expenses - Get all diesel expenses (Admin side)
router.get('/', jwt, dieselExpenseController.getAllExpenses);

// GET /diesel-expenses/:id - Get a single diesel expense by ID
router.get('/:id', jwt, dieselExpenseController.getExpenseById);

// GET /diesel-expenses/driver/:driverId - Get all diesel expenses created by a specific driver
router.get('/driver/:driverId', jwt, dieselExpenseController.getExpensesByDriver);

// POST /diesel-expenses - create new diesel-expenses
router.post('/', imageUpload.array('images', 3), jwt, dieselExpenseController.createExpense);

// PUT /diesel-expenses/:id - udpate existing diesel-expenses
router.get('/', jwt, dieselExpenseController.updateExpense);

// PUT /diesel-expenses/:id - udpate existing diesel-expenses
router.put('/:id', imageUpload.array('images', 3), jwt, dieselExpenseController.updateExpense);

// PATCH /diesel-expenses/:id/approve - approve existing diesel-expenses
router.patch('/:id/approve', jwt, dieselExpenseController.toggleApproval);

module.exports = router;
