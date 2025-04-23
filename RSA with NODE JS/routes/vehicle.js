const express = require('express');
const controller = require('../Controller/vehicle');
const Jwt = require('../Middileware/jwt')
const upload = require('../config/multer')
const router = express.Router();


// Route for getting all records
router.get('/compliance-record', Jwt,controller.getAllRecordDetails);

//Route for dismissing expericed record
router.patch('/compliance-record-dismiss', Jwt,controller.dismissExpiredRecord);

//Route for getting single record by ID
router.get('/compliance-record/:id', Jwt,controller.getRecordById);

//Route for delete record by Id
router.delete('/compliance-record/:id', Jwt,controller.deleteRecord);


//Route for creating a new record for 
router.post('/compliance-record', Jwt, upload.array('images', 2), controller.addRecord);


// Route for creating a new vehicle
router.post('/', Jwt, controller.createVehicle);

// Route for getting all vehicle
router.get('/', Jwt, controller.getAllVehicle);

// Route for getting all exceeded service vehicle
router.get("/exceeded-service", controller.getVehiclesExceedingServiceKM);

//Route for dissmiss serviceKm vehicle
router.put("/:vehicleId/update-status", controller.updateVehicleServiceStatus);


// Route for getting a single vehicle by ID
router.get('/:id', Jwt, controller.getVehicleById);

// Route for updating a vehicle by ID
router.put('/:id', Jwt, controller.updateVehicle);

// Route for deleting a vehicle by ID
router.delete('/:id', Jwt, controller.deleteVehicle);

router.put('/compliance-record/:id', Jwt, upload.array('images', 2), controller.updateRecord);


module.exports = router;
