const express = require('express');
const router = express.Router();
const controller = require('../Controller/admin'); // Adjust the path as needed
const upload = require('../config/multer');
const { bookingPhotos, dated, profile, vehiclePapers, reward, adminQr } = require('../config/mediaPlacement');
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');

// Route to register a new admin
router.post('/register', controller.registerAdmin);

// Route to login an admin
router.post('/login', controller.loginAdmin);

// Add/Update Admin QR
// Payment QR shown in the driver & provider apps — any logged-in user (older provider tokens carry no role)
router.get('/qr', jwt, controller.getAdminQR);

router.patch('/qr', jwt, roleAuth('Admin'), upload.single('qr', adminQr), controller.updateAdminQR);

module.exports = router;
