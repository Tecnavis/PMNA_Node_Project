const express = require('express');
const router = express.Router();
const controller = require('../Controller/admin'); // Adjust the path as needed

// Route to register a new admin
router.post('/register', controller.registerAdmin);

// Route to login an admin
router.post('/login', controller.loginAdmin);

module.exports = router;
