const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/permissions');

router.get('/me', jwt, c.me);
router.get('/actions', jwt, roleAuth('Admin', 'Staff'), c.actions);
router.get('/roles', jwt, roleAuth('Admin'), c.roles);
router.put('/roles/:id', jwt, roleAuth('Admin'), c.saveRole);
router.get('/staff', jwt, roleAuth('Admin'), c.staff);
router.put('/staff/:id', jwt, roleAuth('Admin'), c.saveStaff);

module.exports = router;
