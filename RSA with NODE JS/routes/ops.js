const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const ops = require('../Controller/operations');

// Operations centre for the admin website (read-only)
const adminSite = [jwt, roleAuth('Admin', 'Staff')];
router.get('/live', adminSite, ops.live);
router.get('/board', adminSite, ops.board);
router.get('/approvals', adminSite, ops.approvals);
router.get('/summary', adminSite, ops.summary);
router.get('/trend', adminSite, ops.trend);

module.exports = router;
