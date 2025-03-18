const express = require('express');
const controller = require('../Controller/reward');

const router = express.Router();



const upload = require('../config/multer');
const jwt = require('../Middileware/jwt')

// Routes
router.post('/',jwt, upload.single('image'), controller.createReward);
router.get('/',jwt, controller.getAllRewards);
router.get('/:id',jwt, controller.getRewardById);
router.put('/:id',jwt,upload.single('image'), controller.updateReward);
router.delete('/:id',jwt, controller.deleteReward);

module.exports = router;
