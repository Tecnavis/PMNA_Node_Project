// routes/workRoutes.js
const express = require('express');
const router = express.Router();
const workController = require('../Controller/workController');
const auth = require('../Middileware/jwt');

// Protected routes
router.post('/generate-daily', auth, workController.generateDailyWork);
router.put('/update-task', auth, workController.updateTaskStatus);
// routes/workRoutes.js - Add these routes

// Get daily report with filtering
router.get('/daily-report', auth, async (req, res) => {
  try {
    const { date, staffName } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const filter = { 
      date: { 
        $gte: queryDate,
        $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
      }
    };

    // Filter by staff name if provided
    if (staffName) {
      const staff = await Staff.findOne({ name: staffName });
      if (staff) {
        filter.staff = staff._id;
      }
    }

    const reports = await StaffDailyWork.find(filter)
      .populate('staff', 'name email staffType')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      totalStaff: reports.length,
      totalTasks: reports.reduce((sum, report) => sum + report.totalTasks, 0),
      completedTasks: reports.reduce((sum, report) => sum + report.completedTasks, 0),
      pendingTasks: reports.reduce((sum, report) => sum + report.pendingTasks, 0),
      completionRate: reports.length > 0 ? 
        Math.round((reports.reduce((sum, report) => sum + report.completedTasks, 0) / 
        reports.reduce((sum, report) => sum + report.totalTasks, 0)) * 100) : 0
    };

    res.status(200).json({
      message: 'Daily report fetched successfully',
      data: reports,
      statistics: stats,
      date: queryDate.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff template tasks
router.get('/staff-template/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const template = await StaffWorkAssignment.findOne({ 
      staff: staffId, 
      isActive: true 
    }).populate('staff', 'name staffType');

    if (!template) {
      return res.status(404).json({ 
        message: 'No template found for this staff member' 
      });
    }

    res.status(200).json({
      message: 'Staff template fetched successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/my-today-work', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const work = await StaffDailyWork.findOne({
      staff: req.user.id,
      date: { $gte: today }
    });
    
    res.status(200).json(work || { message: 'No work assigned for today' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// routes/workRoutes.js - Add new routes
router.get('/staff-list', auth, workController.getStaffList);
router.get('/daily-report-by-date', auth, workController.getDailyReportByDate);
router.post('/add-task', auth, workController.addCustomTask);
router.put('/update-task-details', auth, workController.updateTaskDetails);
router.delete('/delete-task', auth, workController.deleteTask);

module.exports = router;