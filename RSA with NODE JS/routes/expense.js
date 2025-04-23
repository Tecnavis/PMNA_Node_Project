const express = require('express');
const expenseController = require('../Controller/expense');
const router = express.Router();
const jwt = require('../Middileware/jwt')
const upload = require('../config/multer');


router.get('/', jwt, expenseController.getAllExpense);

router.patch('/:id', jwt, upload.single('image'), expenseController.udpateExpense)

router.post('/:id', jwt, upload.single('image'), expenseController.createExpense)

router.patch('/approve-expense/:id', jwt, expenseController.approve);

router.get('/get-expense/:id', jwt, expenseController.getExpenseById)

router.get('/driver-expense/:id', jwt, expenseController.getAllExpenseForDriver)


module.exports = router;
