const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/audit');

router.get('/logins', jwt, roleAuth('Admin'), c.logins);
router.get('/activity', jwt, roleAuth('Admin'), c.activity);

module.exports = router;
