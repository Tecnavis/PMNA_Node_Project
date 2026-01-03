const controller = require('../Controller/archiveController')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

router.post('/archive', jwt, controller.archiveOldData);
router.get('/stats', jwt, controller.getArchiveStats);
router.get('/debug', jwt, controller.debugArchiveQuery); // ADD THIS
router.get('/verify', jwt, controller.verifyArchiveStatus); // ADD THIS
router.get('/bookings', jwt, controller.getArchivedBookings);

router.post('/force-batch', jwt, controller.forceArchiveBatch);
// Add to routes/archive.js
router.post('/move-archived', jwt, controller.moveArchivedBookings);
router.post('/archive-and-move', jwt, controller.archiveAndMove);
router.get('/migration-stats', jwt, controller.getMigrationStats);
module.exports = router;
// ---------------------------------------------------------