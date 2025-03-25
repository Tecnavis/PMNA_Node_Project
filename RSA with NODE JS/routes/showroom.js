const express = require('express');
const router = express.Router();
const controller = require('../Controller/showroom');
const upload = require('../config/multer'); // Assuming multer setup is exported here
const jwt = require('../Middileware/jwt')

router.post('/',jwt, upload.single('image'), controller.createShowroom);
router.get('/', controller.getShowrooms);
router.get('/showroom-staff', jwt, controller.getAllShowroomStaff)
router.get('/filtered', jwt, controller.filterGetShowrooms);

router.put('/:id',jwt, upload.single('image'), controller.updateShowroom);
router.get('/:id',jwt, controller.getShowroomById);
router.delete('/:id',jwt, controller.deleteShowroom);

module.exports = router;
