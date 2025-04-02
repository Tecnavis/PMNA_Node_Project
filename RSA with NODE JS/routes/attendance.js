const express = require('express');
const router = express.Router();
const controller = require('../Controller/attendance');
const jwt = require('../Middileware/jwt');

//Route for checkin attendance (create new attance doc)
router.post('/', jwt, controller.checkIn)
//Route get all attendance
router.get('/', jwt, controller.getAllStaffAttendance)
//Route get all attendance for particular staff
router.get('/:id', jwt, controller.getAttendanceForStaff)
//Route for checkout attendance (udpate checkout data and location)
router.patch('/:id', jwt, controller.checkOut)

router.post('/admin-check-in/:id', jwt, controller.adminCheckInForStaff)

module.exports = router