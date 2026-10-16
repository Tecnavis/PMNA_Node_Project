const express = require('express');
const router = express.Router();
const bot = require('../Controller/whatsappBot');

// Meta WhatsApp Cloud API webhook. Raw body is needed to check Meta's signature.
router.get('/webhook', bot.verify);
router.post('/webhook', express.raw({ type: '*/*', limit: '2mb' }), bot.receive);

module.exports = router;
