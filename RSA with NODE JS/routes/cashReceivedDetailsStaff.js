const controller = require('../Controller/cashReceivedDetailsStaff')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();
router.post('/', jwt, controller.createReceivedDetailsStaff)
router.get( '/', jwt, controller.getReceivedDetailsStaff) // Add this line

router.get('/staff-cash-summary', jwt, controller.getStaffCashSummary)


module.exports = router;