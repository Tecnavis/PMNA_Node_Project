// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../Controller/company');
const upload = require('../config/multer');
const jwt = require('../Middileware/jwt')

router.post('/', jwt, upload.single('image'), controller.createCompany);
router.get('/', controller.getCompanies);
router.get('/filtered', jwt, controller.filtergetCompanies);
router.get('/:id', jwt, controller.getCompanyById);
router.put('/:id', upload.single('image'), controller.updateCompany);
router.delete('/:id', jwt, controller.deleteCompany);

module.exports = router;
