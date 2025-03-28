const express = require('express');
const router = express.Router();
const controller = require('../Controller/baseLocation'); // Adjust the path as needed
const jwt = require('../Middileware/jwt')

// Route to create a new baselocation
router.post('/',jwt,controller.createBaseLocation);

// Route to get all baselocation
router.get('/',controller.getBaseLocations)

//Route to get by id baselocation
router.get('/:id',jwt,controller.getBaseLocationById)

//Route to update baselocation
router.put('/:id',jwt,controller.updateBaseLocation)

//Route to delete baselocation
router.delete('/:id',jwt,controller.deleteBaseLocation)

module.exports = router;