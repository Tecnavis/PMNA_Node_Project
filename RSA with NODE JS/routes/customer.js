const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const c = require('../Controller/customer');

// RSA customer app
router.post('/auth/send-otp', c.sendOtp);
router.post('/auth/verify-otp', c.verifyOtp);
router.get('/options', c.options);
router.get('/me', jwt, c.getMe);
router.put('/me', jwt, c.updateMe);
router.get('/bookings', jwt, c.listBookings);
router.post('/bookings', jwt, c.createBooking);
router.get('/bookings/:id', jwt, c.getBooking);
router.post('/bookings/:id/cancel', jwt, c.cancelBooking);

module.exports = router;
