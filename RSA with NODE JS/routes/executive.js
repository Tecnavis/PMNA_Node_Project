const express = require('express');
const router = express.Router();
const executiveController = require('../Controller/executive');
const ShowroomVerification = require('../Controller/ShowroomVerification');
const { validateHandler } = require('../Middileware/validateHandler');
const upload = require('../config/multer');
const { CreateExecutiveSchema } = require('../validations/dtos/user/createExecutiveDto');
const jwt = require('../Middileware/jwt')

router.post(
    '/',
    jwt,
    upload.single('image'),
    CreateExecutiveSchema,
    validateHandler,
    executiveController.createExecutive
);

router.get(
    '/',
    jwt,
    executiveController.getAllMarketingExecutive
);

router.get(
    '/:id',
    jwt,
    executiveController.getExecutiveById
);

router.put(
    '/:id',
    jwt,
    upload.single('image'),
    executiveController.udpateExecutiveDetails
);

router.delete(
    '/:id',
    jwt,
    upload.single('image'),
    executiveController.deleteExecutive
);

router.post(
    '/showroom-verifiction',
    jwt,
    upload.single('image'),
    ShowroomVerification.verifyMonthlyVerification
);

module.exports = router;