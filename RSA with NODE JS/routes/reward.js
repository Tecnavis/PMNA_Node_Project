const express = require('express');
const router = express.Router();
const controller = require('../Controller/reward');
const upload = require('../config/multer');
const jwt = require('../Middileware/jwt')

// Routes
router.post('/', jwt, upload.single('image'), controller.createReward)
    .get('/', jwt, controller.getAllRewards)
    .get('/redeem-reward', jwt, controller.redeemReward)
    .get('/redemtions', jwt, controller.getAllredemationsBaseUserType)
    .get('/redemable-rewards', jwt, controller.getAllRedeemableRewards)
    .get('/redeems', jwt, controller.getAllRedeems)
    .patch('/showroom-redeem/:showroomId', jwt, controller.redeemShowroomPoint)
    .get('/:id', jwt, controller.getRewardById)
    .put('/:id', jwt, upload.single('image'), controller.updateReward)
    .delete('/:id', jwt, controller.deleteReward)
    .patch('/approve-redeem/:id', jwt, controller.approveRedeemById)
    .patch('/reject-redeem/:id', jwt, controller.rejectRedeemById)

module.exports = router;
