
const express = require('express');
const router = express.Router();
const controller = require('../Controller/workController');
const jwt = require('../Middileware/jwt');

router.post('/',jwt, controller.createWork);
router.get('/',jwt, controller.getAllWork);
router.get('/statistics',jwt, controller.getWorkStatistics);
router.get('/staff/:staffId',jwt, controller.getWorkByStaff);
router.get('/:id',jwt, controller.getWorkById);
router.put('/:id',jwt, controller.updateWork);
router.delete('/:id',jwt, controller.deleteWork);

// Task specific routes
router.put('/:workId/tasks/:taskId',jwt, controller.updateTask);
router.delete('/:workId/tasks/:taskId',jwt, controller.deleteTask);

module.exports = router;