const express = require('express');
const router = express.Router();
const controller = require('../Controller/booking');
const jwt = require('../Middileware/jwt');
const upload = require('../config/multer');


// Route to create a new booking
router.post('/', controller.createBooking);

//Route for getting approved bookings
router.post('/no-auth', controller.createBookingNoAuth);

//Route for getting approved bookings
router.get('/approvedbookings', jwt, controller.getApprovedBookings);

//Route to get all bookings base on status
router.get('/status-based', jwt, controller.getAllBookingsBasedOnStatus);

// Route to get booking
router.get('/', jwt, controller.getAllBookings);

// Route to get booking
router.get('/getordercompleted', jwt, controller.getOrderCompletedBookings);

// Route to get booking by id
router.get('/:id', controller.getBookingById);

// Route to update booking
router.put('/:id', upload.array('images', 6), controller.updateBooking);

// Route to delete booking
// router.delete('/:id',jwt,controller.deleteBooking);

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
router.post('/upload', upload.single('image'), controller.uploadImage);


module.exports = router;