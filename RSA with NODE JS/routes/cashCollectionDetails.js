const controller = require('../Controller/cashCollectionDetails')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();


router.get('/', jwt, controller.getAllCashCollectionDetails)
router.get('/:staffId', jwt, controller.getCashCollectionDetailsByStaffId);

router.post('/', jwt, controller.createCashCollectionDetails)

module.exports = router;