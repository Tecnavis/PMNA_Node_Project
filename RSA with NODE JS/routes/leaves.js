const express = require('express');
const router = express.Router();
const leaveController = require('../Controller/leaves'); // Check folder name/casing!
const jwt = require('../Middileware/jwt');
const upload = require('../config/multer');

// Route for creating a new leave
router.post('/', jwt, leaveController.createLeaves);

// Route for getting all leaves
router.get('/', jwt, leaveController.getAllLeaves);

// Route for getting a specific leave by ID
router.get('/:id', jwt, leaveController.getLeavesById);

// Route for updating a leave by ID
router.put('/:id', jwt, leaveController.updateLeaves);

// Route for deleting a leave by ID
router.delete('/:id', jwt, leaveController.deleteLeaves);

module.exports = router;
