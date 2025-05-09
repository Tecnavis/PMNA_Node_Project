const controller = require('../Controller/advance')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

router.get('/', jwt, controller.getAllAdvance)
router.post('/', jwt, controller.createNewAdvance)

module.exports = router;