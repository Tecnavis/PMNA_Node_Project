const express = require('express');
const router = express.Router();
const controller = require('../Controller/booking');
const jwt = require('../Middileware/jwt');
const upload = require('../config/multer');


// Route to create a new booking
router.post('/', jwt, controller.createBooking);

//Route for getting approved bookings
router.post('/no-auth', controller.createBookingNoAuth);

//Route for getting approved bookings
router.get('/approvedbookings', jwt, controller.getApprovedBookings);

//Route to get all bookings base on status
router.get('/status-based', controller.getAllBookingsBasedOnStatus);

// Route to get booking
router.get('/', jwt, controller.getAllBookings);

// Route to get booking
router.get('/getordercompleted', jwt, controller.getOrderCompletedBookings);

// Route to distribute received amount
router.patch('/distribute-amount', jwt, controller.distributeReceivedAmount);

// Route for add booking for showroom dashboard
router.get('/showroom/bookings', jwt, controller.getBookingsForShowroom)

// Route for getting booking for showroom staff base on stats
router.get('/showroom-staff/bookings', jwt, controller.getBookingsForShowroomStaff)

// Rotute for upload image
router.post('/upload', jwt, upload.single('image'), controller.uploadImage);

// Route for settle driver balalance salary
router.patch('/settle-driver-balance-salary', jwt, controller.updateBalanceSalary);

// Route for add booking for showroom dashboard
router.post('/showroom/add-booking', jwt, controller.addBookingForShowroom)

// Route to get booking by id
router.get('/:id', controller.getBookingById);

// Route to update booking
router.put('/:id', jwt, upload.array('images', 6), controller.updateBooking);

// Route to cancel booking
router.patch('/cancel/:id', jwt, upload.single('image'), controller.cancelBooking);
// Route to inventory image add 
router.patch('/inventory/:id', jwt, upload.single('image'), controller.inventoryBooking);

//Route to update the pickup and dropoff details
router.put('/pickupbyadmin/:id', jwt, controller.updatePickupByAdmin);

// Route for the removing the pickup Image
router.patch('/pickupimage/:id/:index', jwt, controller.removePickupImages);

// Route for adding pickup images
router.patch('/addingpickupimage/:id', jwt, upload.array('images', 6), controller.addPickupImages);

// Route for the removing the dropoff Image
router.patch('/dropoffimage/:id/:index', jwt, controller.removeDropoffImages);

// Route for adding pickup images
router.patch('/addingdropoffimage/:id', jwt, upload.array('images', 6), controller.addDropoffImages);

//Route for editing fileNumber 
router.patch('/updatefilenumber/:id', jwt, controller.updateFilenumber);

// Route for verify booking 
router.patch('/verifybooking/:id', jwt, controller.verifyBooking);

//Route for posting feedback
router.put('/postfeedback/:id', jwt, controller.postFeedback);

//Route for accountant verification
router.patch('/accountantverify/:id', jwt, controller.accountVerifying);

//Route to settle booking amount
router.patch('/sattle-amount/:id', jwt, controller.settleAmount);

//Route to approve booking
router.patch('/update-approve/:id', jwt, controller.updateBookingApproved);

module.exports = router;