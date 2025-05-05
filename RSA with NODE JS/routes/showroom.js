const express = require('express');
const router = express.Router();
const controller = require('../Controller/showroom');
const upload = require('../config/multer'); // Assuming multer setup is exported here
const jwt = require('../Middileware/jwt')

router.post('/create',jwt, upload.single('image'), controller.createShowroom);
router.post('/',jwt, upload.single('image'), controller.createShowroom);
router.get('/', controller.getShowrooms);
// Login Showroom
router.post('/login', controller.loginShowroom);
router.get('/showroom-staff', jwt, controller.getAllShowroomStaff)
router.get('/showroom-staff/:id', controller.getShowroomStaffs)
router.get('/get-showroom-staff/:id', controller.getShowroomStaffById)
router.get('/report',jwt, controller.showroomDashBoardReport);
router.get('/showroom-staff-profile',jwt, controller.getStaffProfile);
router.get('/all-showrooms',jwt, controller.getPaginatedShowrooms);

router.get('/filtered', jwt, controller.filterGetShowrooms);

router.post('/staff-signin',  controller.staffLogin);
router.post('/staff-signup',  controller.showroomStaffSignup);
router.post('/add-staff',  controller.addStaffMember);
router.put('/update-staff/:staffId',  controller.updateStaffMember);



// PUT /showroom/update-staff/:staffId
router.put('/:id',jwt, upload.single('image'), controller.updateShowroom);
router.get('/:id',jwt, controller.getShowroomById);
router.delete('/:showroomId/staff-delete/:staffId',  controller.deleteShowroomStaff);
router.delete('/:id',jwt, controller.deleteShowroom);

module.exports = router;
