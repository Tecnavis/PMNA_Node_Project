const controller = require('../Controller/cashReceivedShowroom')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();
router.post('/', jwt, controller.createShowroomPayment)
router.get( '/', jwt, controller.getShowroomPayments) // Add this line
module.exports = router;