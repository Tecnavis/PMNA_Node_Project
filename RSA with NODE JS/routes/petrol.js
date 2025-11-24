const express = require('express');
const router = express.Router();
const controller = require('../Controller/petrolPump');
const jwt = require('../Middileware/jwt');

// Route to create a new PetrolPump
router.post('/', jwt, controller.createPetrolPump);

// Route to get all PetrolPump
router.get('/', controller.getPetrolPump);

// Route to get by id PetrolPump
router.get('/:id', jwt, controller.getPetrolPumpId);

// Route to update PetrolPump
router.put('/:id', jwt, controller.updatePetrolPump);

// Route to delete PetrolPump
router.delete('/:id', jwt, controller.deletePetrolPump);

// Additional routes (optional)
// Route to get petrol pumps by fuel type
router.get('/fuel-type/:fuelType', controller.getPumpsByFuelType);

// Route to search petrol pumps by location
router.get('/search/location', controller.searchPumpsByLocation);

module.exports = router;