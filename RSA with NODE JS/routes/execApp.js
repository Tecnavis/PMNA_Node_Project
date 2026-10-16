const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const ctl = require('../Controller/execApp');

// Marketing Executive mobile app (token role "executive")
const execOnly = [jwt, roleAuth('executive')];
router.get('/me', execOnly, ctl.me);
router.get('/showrooms', execOnly, ctl.showrooms);
router.get('/showrooms/:id', execOnly, ctl.showroom);

module.exports = router;
