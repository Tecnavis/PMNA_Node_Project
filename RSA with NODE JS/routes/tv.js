const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const tv = require('../Controller/tv');

router.post('/login', tv.login);
router.get('/live', tv.requireTv, tv.live);
router.get('/settings', jwt, roleAuth('Admin', 'Staff'), tv.settings);
router.put('/passcode', jwt, roleAuth('Admin'), tv.setPasscode);
router.delete('/passcode', jwt, roleAuth('Admin'), tv.disable);

module.exports = router;
