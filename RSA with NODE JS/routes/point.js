var express = require('express');
var { getPoint, updatePoint,getShowroomBookingPoints,updateShowroomBookingPoints } = require("../Controller/point")
var router = express.Router();
const jwt = require('../Middileware/jwt')


/* Update showroom BookingPoint. */
router.get('/', jwt, getPoint);
router.put('/', jwt, updatePoint);

// Update and get showroomstaff and showroom bookingpoint
router.get('/showroom', jwt, getShowroomBookingPoints);
router.put('/showroom', jwt, updateShowroomBookingPoints);


module.exports = router;
