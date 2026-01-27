// routes/workRoutes.js - Update with all routes
const express = require('express');
const router = express.Router();
const workController = require('../Controller/workController');
const auth = require('../Middileware/jwt');
const StaffDailyWork = require('../Model/staffDailyWork'); // Add this import


// Staff list endpoints
router.get('/staff-list', auth, workController.getStaffList);

// Template management
router.get('/templates', auth, workController.getAllTemplates);
router.get('/templates/:staffId', auth, workController.getTemplateByStaff);
router.post('/templates', auth, workController.saveTemplate);
router.put('/templates/:id', auth, workController.saveTemplate);
router.delete('/templates/:id', auth, workController.deleteTemplate);

// Daily work generation
router.post('/generate-daily', auth, workController.generateDailyWork);
router.post('/generate-all-daily', auth, workController.generateAllDailyWork);

// Task management
router.put('/update-task', auth, workController.updateTaskStatus);
router.post('/add-task', auth, workController.addCustomTask);
router.put('/update-task-details', auth, workController.updateTaskDetails);
router.delete('/delete-task', auth, workController.deleteTask);

// Reports
router.get('/daily-report', auth, workController.getDailyReport);
router.get('/daily-report-by-date', auth, workController.getDailyReportByDate);

// Get today's work for logged-in staff
router.get('/my-today-work', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const work = await StaffDailyWork.findOne({
      staff: req.user.id,
      date: { $gte: today }
    }).populate('staff', 'name staffType');
    
    if (!work) {
      return res.status(200).json({ 
        message: 'No work assigned for today',
        data: null 
      });
    }
    
    res.status(200).json({
      message: 'Today\'s work fetched successfully',
      data: work
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;