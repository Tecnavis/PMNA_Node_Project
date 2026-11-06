const express = require('express');
const router = express.Router();
const jwt = require('../Middileware/jwt');
const roleAuth = require('../Middileware/roleAuth');
const ctl = require('../Controller/execTasks');

// Admin website only (admin + staff). Changes can be switched off per staff with "executives.assign".
const office = [jwt, roleAuth('Admin', 'Staff')];

router.get('/executives', office, ctl.executives);
router.get('/showrooms', office, ctl.showrooms);
router.post('/assign', office, ctl.assign);
router.post('/unassign', office, ctl.unassign);

router.get('/report/summary', office, ctl.reportSummary);
router.get('/report/visits', office, ctl.reportVisits);
router.get('/report/new-showrooms', office, ctl.reportNewShowrooms);

router.get('/', office, ctl.list);
router.post('/', office, ctl.create);
router.patch('/:id', office, ctl.update);
router.delete('/:id', office, ctl.cancel);

module.exports = router;
