// routes/staffRoutes.js
const express = require('express');
const upload = require('../config/multer');
const router = express.Router();
const controller = require('../Controller/staff');
const jwt = require('../Middileware/jwt');


// Create staff route with image upload
router.post('/',jwt,upload.single('image'), controller.createStaff);

// Get all staff
router.get('/',jwt,controller.getAllStaff);


// Get staff by Filter
router.get('/filtered', jwt, controller.filterGetStaffs);
// Get staff by ID
router.get('/:id',jwt, controller.getStaffById);
// Update staff
router.put('/:id',jwt, upload.single('image'), controller.updateStaff);

// Delete staff
router.delete('/:id',jwt, controller.deleteStaff);

//Staff log-in
router.post('/login',controller.loginStaff)

module.exports = router;
