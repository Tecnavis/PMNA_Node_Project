const controller = require('../Controller/cashReceivedDetails')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

router.get('/', jwt, controller.getAllReceivedDetails)
router.post('/', jwt, controller.createReceivedDetails)

module.exports = router;