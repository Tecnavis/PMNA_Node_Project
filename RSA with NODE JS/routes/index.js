var express = require('express');
var controller = require("../Controller/index")
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/dashboard',controller.dashboard)

module.exports = router;
