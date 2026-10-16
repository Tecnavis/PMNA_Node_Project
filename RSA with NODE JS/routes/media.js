const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const { searchCasePhotos } = require('../Controller/casePhotos');
const cleanup = require('../Controller/mediaCleanup');

// Find case photos by case ID / vehicle number and/or date (admin website → "Case Photos")
router.get('/case-photos', jwt, roleAuth('Admin', 'admin', 'Staff'), searchCasePhotos);

// Bulk delete photos for a company + date range (preview: admin site; delete: Admin only)
router.post('/bulk-delete/preview', jwt, roleAuth('Admin', 'Staff'), cleanup.preview);
router.post('/bulk-delete/start', jwt, roleAuth('Admin'), cleanup.start);
router.get('/bulk-delete/jobs', jwt, roleAuth('Admin', 'Staff'), cleanup.jobs);

module.exports = router;
