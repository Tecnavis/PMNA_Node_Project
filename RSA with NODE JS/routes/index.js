var express = require('express');
var controller = require("../Controller/index");
const jwt = require('../Middileware/jwt');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: "RSA API is running ✅"
    });
});

router.get('/dashboard',  controller.dashboard)
router.get('/showroom-dashboard/:id', jwt, controller.showroomDashboard)
router.get('/logs',  controller.logs)

module.exports = router;
