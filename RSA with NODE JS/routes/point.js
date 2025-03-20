var express = require('express');
var { getPoint, updatePoint } = require("../Controller/point")
var router = express.Router();
const jwt = require('../Middileware/jwt')


/* Update showroom BookingPoint. */
router.get('/', jwt, getPoint);
router.put('/', jwt, updatePoint);


module.exports = router;
