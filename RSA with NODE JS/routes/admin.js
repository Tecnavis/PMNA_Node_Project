const express = require('express');
const router = express.Router();
const controller = require('../Controller/admin'); // Adjust the path as needed
const upload = require('../config/multer');
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');

// Route to register a new admin
router.post('/register', controller.registerAdmin);

// Route to login an admin
router.post('/login', controller.loginAdmin);

// Add/Update Admin QR
router.get('/qr', jwt, roleAuth('Admin', "Driver", "Provider", 'Staff'), controller.getAdminQR);

router.patch('/qr', jwt, roleAuth('Admin'), upload.single('qr'), controller.updateAdminQR);

module.exports = router;
