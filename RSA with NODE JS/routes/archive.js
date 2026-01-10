// // routes/archive.js
// const controller = require('../Controller/archiveController')
// const jwt = require('../Middileware/jwt');
// const express = require('express');
// const router = express.Router();

// // Existing routes
// router.post('/archive', jwt, controller.archiveOldData);
// router.get('/stats', jwt, controller.getArchiveStats);
// router.get('/stats-by-worktype', jwt, controller.getArchiveStatsByWorkType); // Fixed route name




// router.get('/debug', jwt, controller.debugArchiveQuery);
// router.get('/verify', jwt, controller.verifyArchiveStatus);
// router.get('/bookings', jwt, controller.getArchivedBookings);
// router.post('/force-batch', jwt, controller.forceArchiveBatch);
// router.post('/move-archived', jwt, controller.moveArchivedBookings);
// router.post('/archive-and-move', jwt, controller.archiveAndMove);
// router.get('/migration-stats', jwt, controller.getMigrationStats);

// // New routes for PaymentWork specific operations
// router.post('/archive-paymentwork', jwt, controller.archivePaymentWorkBookings);
// router.post('/restore-nonpaymentwork', jwt, controller.restoreNonPaymentWorkBookings);
// router.post('/clean-and-archive', jwt, controller.cleanAndArchive);
// router.get('/detailed-stats', jwt, controller.getDetailedStats);

// module.exports = router;
// routes/archive.js
const controller = require('../Controller/archiveController');
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

// Main endpoint for your concept
router.post('/clean-and-archive', jwt, controller.cleanAndArchive);

// Individual operations
router.post('/archive-paymentwork', jwt, controller.archivePaymentWorkBookings);
router.post('/restore-nonpaymentwork', jwt, controller.restoreNonPaymentWorkBookings);

// View data
router.get('/stats', jwt, controller.getArchiveStats);
router.get('/bookings', jwt, controller.getArchivedBookings);

module.exports = router;