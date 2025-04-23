// routes/serviceType.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../Controller/serviceType');
const jwt = require('../Middileware/jwt');

// Route for creating a new service type
router.post('/',jwt,controller.createServiceType);

// Route for getting all service types
router.get('/',controller.getAllServiceTypes);

// Route for getting a specific service type by ID
router.get('/:id',jwt,controller.getServiceTypeById);

// Route for updating a service type by ID
router.put('/:id',jwt,controller.updateServiceType);

// Route for deleting a service type by ID
router.delete('/:id',jwt,controller.deleteServiceType);

module.exports = router;
