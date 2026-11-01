const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/showroomPortal');

const showroomSite = [jwt, roleAuth('Showroom', 'ShowroomStaff')];
router.post('/bookings/:id/tracking', showroomSite, c.tracking);
router.get('/statement', showroomSite, c.statement);

module.exports = router;
