const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const c = require('../Controller/backups');

router.get('/', jwt, roleAuth('Admin'), c.list);
router.post('/run', jwt, roleAuth('Admin'), c.run);
router.get('/:set/:file', jwt, roleAuth('Admin'), c.download);

module.exports = router;
