const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const reports = require('../Controller/reports');

// Reports Centre for the admin website (read-only)
const adminSite = [jwt, roleAuth('Admin', 'Staff')];
router.get('/bookings', adminSite, reports.bookings);
router.get('/expenses', adminSite, reports.expenses);
router.get('/options', adminSite, reports.options);
router.get('/showrooms', adminSite, reports.showrooms);

module.exports = router;
