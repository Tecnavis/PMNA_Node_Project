const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/insights');

router.get('/scorecard', jwt, roleAuth('Admin', 'Staff'), c.scorecard);
router.get('/daily-summary', jwt, roleAuth('Admin'), c.dailySummary);
router.post('/daily-summary/send', jwt, roleAuth('Admin'), c.sendSummary);

module.exports = router;
