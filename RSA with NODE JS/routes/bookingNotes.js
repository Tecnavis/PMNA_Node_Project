const express = require('express');
const router = express.Router();
const controller = require('../Controller/bookingNotes');
const jwt = require('../Middileware/jwt')

router.post('/:id', jwt, controller.addBookingNote);
router.get('/', jwt, controller.getNotesForBooking);

module.exports = router