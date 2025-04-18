var express = require('express');
var controller = require("../Controller/index");
const jwt = require('../Middileware/jwt');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/dashboard',  controller.dashboard)
router.get('/showroom-dashboard/:id', jwt, controller.showroomDashboard)

module.exports = router;
