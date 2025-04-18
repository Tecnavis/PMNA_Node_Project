// routes/driver.routes.js
const express = require('express');
const driverController = require('../Controller/driver');
const upload = require('../config/multer');
const router = express.Router();
const jwt = require('../Middileware/jwt')

router.post('/', jwt, upload.single('image'), driverController.createDriver); // 'image' is the name of the file field
router.get('/', driverController.getDrivers);
router.get('/filtered', jwt, driverController.filtergetDrivers);
router.get('/:id', jwt, driverController.getDriverById);
router.put('/:id', jwt, upload.single('image'), driverController.updateDriver);
router.delete('/:id', jwt, driverController.deleteDriver);

// Log in for provider
router.post('/send-otp', driverController.sendOtp);

// OTP verify and login
router.post('/verify-login', driverController.verifyOTP);

module.exports = router;
