const express = require('express');
const router = express.Router();
const controller = require('../Controller/settlementTransaction');
const jwt = require('../Middileware/jwt')


router.post('/transactions', jwt, controller.createSettlementTransaction );
router.get('/transaction', jwt, controller.getSettlementTransactions );


module.exports = router;
