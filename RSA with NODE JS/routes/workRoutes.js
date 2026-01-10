// routes/workRoutes.js
const express = require('express');
const router = express.Router();
const workController = require('../Controller/workController');
const jwt = require('../Middileware/jwt');

// Assign template works to staff (Admin only)
router.post('/assign-template', jwt, workController.assignTemplateWorks);

// Get staff's template works
router.get('/template/:staffId', jwt, workController.getStaffTemplateWorks);

// Generate daily work from template
router.post('/generate-daily', jwt, workController.generateDailyWork);

// Update work status (Staff)
router.put('/update-status/:dailyWorkId', jwt, workController.updateWorkStatus);

// Get staff's daily work
router.get('/daily/:staffId/:date?', jwt, workController.getStaffDailyWork);

// Get all staffs daily work (Admin)
router.get('/all-daily', jwt, workController.getAllStaffsDailyWork);

// Get staff work history
router.get('/history/:staffId', jwt, workController.getStaffWorkHistory);

module.exports = router;