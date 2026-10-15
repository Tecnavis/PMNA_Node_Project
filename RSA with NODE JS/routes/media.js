const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const { searchCasePhotos } = require('../Controller/casePhotos');

// Find case photos by case ID / vehicle number and/or date (admin website → "Case Photos")
router.get('/case-photos', jwt, roleAuth('Admin', 'admin', 'Staff'), searchCasePhotos);

module.exports = router;
