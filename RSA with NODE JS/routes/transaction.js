const express = require('express');
const router = express.Router();
const transactionController = require('../Controller/transactionController');
const jwt = require('../Middileware/jwt');

// Add this new route
router.get(
    '/',
    jwt,
    transactionController.getTransactions
);

module.exports = router;