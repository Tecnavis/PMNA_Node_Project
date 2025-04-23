const express = require('express');
const router = express.Router();
const NotificationController = require('../Controller/notification.controller');
const jwt = require('../Middileware/jwt');

router.post('/send-notification', jwt, NotificationController.sendNotification);

module.exports = router;