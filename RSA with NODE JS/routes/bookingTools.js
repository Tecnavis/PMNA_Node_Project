const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const tools = require('../Controller/bookingTools');

const adminSite = [jwt, roleAuth('Admin', 'Staff')];
router.get('/:id/timeline', adminSite, tools.timeline);
router.get('/:id/tracking-links', adminSite, tools.listLinks);
router.post('/:id/tracking-links', adminSite, tools.createLink);
router.delete('/:id/tracking-links/:lid', adminSite, tools.revokeLink);
router.get('/:id/suggest-drivers', adminSite, tools.suggestDrivers);
router.post('/:id/reassign-approval', adminSite, tools.reassignApproval);
router.get('/:id/rating', adminSite, tools.rating);
router.post('/:id/rating-reviewed', adminSite, tools.ratingReviewed);

module.exports = router;
