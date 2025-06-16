const controller = require('../Controller/cashReceivedDetails')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

router.get('/', jwt, controller.getAllReceivedDetails)
router.get('/staff/:staffId', jwt, controller.getStaffReceivedDetails) // Add this line

router.post('/', jwt, controller.createReceivedDetails)

module.exports = router;