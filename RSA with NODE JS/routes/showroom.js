const express = require('express');
const router = express.Router();
const controller = require('../Controller/showroom');
const upload = require('../config/multer'); // Assuming multer setup is exported here
const jwt = require('../Middileware/jwt')

router.post('/',jwt, upload.single('image'), controller.createShowroom);
router.get('/', controller.getShowrooms);
// Login Showroom
router.post('/login', controller.loginShowroom);
router.get('/showroom-staff', jwt, controller.getAllShowroomStaff)
router.get('/showroom-staff/:id', jwt, controller.getShowroomStaffs)
router.get('/filtered', jwt, controller.filterGetShowrooms);
// OTP send for verification
router.post('/staff-send-otp', jwt, controller.sendOtpForShowroomStaff);
// OTP verify and login
router.post('/staff-verify-login', jwt, controller.verifyOTPAndLogin);
router.post('/staff-signup', jwt, controller.showroomStaffSignup);

router.put('/:id',jwt, upload.single('image'), controller.updateShowroom);
router.get('/:id',jwt, controller.getShowroomById);
router.delete('/:id',jwt, controller.deleteShowroom);

module.exports = router;
