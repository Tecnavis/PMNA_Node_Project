const express = require('express');
const router = express.Router();
const controller = require('../Controller/provider');
const upload = require('../config/multer'); // Import Multer configuration
const jwt = require('../Middileware/jwt')

// Create a new provider with image upload
router.post('/',jwt, upload.single('image'), controller.createProvider);

// Get all providers
router.get('/',jwt, controller.getAllProviders);

// Get providre by filter 
router.get('/filtered',jwt, controller.filtergetProviders);

// Get a provider by ID
router.get('/:id',jwt, controller.getProviderById);

// Update a provider by ID with image upload
router.put('/:id',jwt, upload.single('image'), controller.updateProvider);

// Delete a provider by ID
router.delete('/:id',jwt, controller.deleteProvider);

// Log in for provider
router.post('/login',controller.loginProvider);

module.exports = router;
