// routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../Controller/company');
const upload = require('../config/multer');
const { bookingPhotos, dated, profile, vehiclePapers, reward, adminQr } = require('../config/mediaPlacement');
const jwt = require('../Middileware/jwt')

router.post('/', jwt, upload.single('image', profile('companies', 'company')), controller.createCompany);
router.get('/', controller.getCompanies);
router.get('/filtered', jwt, controller.filtergetCompanies);
router.get('/:id', jwt, controller.getCompanyById);
router.put('/:id', upload.single('image', profile('companies', 'company')), controller.updateCompany);
router.delete('/:id', jwt, controller.deleteCompany);

module.exports = router;
