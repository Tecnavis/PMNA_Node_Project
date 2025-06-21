const controller = require('../Controller/advance')
const jwt = require('../Middileware/jwt');
const express = require('express');
const router = express.Router();

router.get('/', jwt, controller.getAllAdvance)
router.post('/', jwt, controller.createNewAdvance)
router.get('/:id', jwt, controller.getAdvanceById); // New route for getting single advance

router.put('/:id', jwt, controller.updateAdvance);  // New route for updating advance

router.get('/monthly-advance/:id', jwt, controller.monthlyAdvance)

module.exports = router;