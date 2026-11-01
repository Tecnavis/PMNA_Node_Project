const express = require('express');
const router = express.Router();
const tracking = require('../Controller/tracking');

// Public: anyone with the (unguessable) link. Shows one case only, never amounts.
router.get('/:token', tracking.page);
router.get('/:token/data', tracking.data);

module.exports = router;
