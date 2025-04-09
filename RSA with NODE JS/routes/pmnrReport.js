const express = require('express');
const router = express.Router();
const pmnrController = require('../Controller/pmnrReport'); // Check folder name/casing!
const jwt = require('../Middileware/jwt');


router.get('/report', jwt, pmnrController.pmnrReport);

module.exports = router;



