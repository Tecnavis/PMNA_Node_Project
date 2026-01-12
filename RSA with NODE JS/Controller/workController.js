// controllers/workController.js
const StaffWorkAssignment = require('../Model/staffWorkAssignment');
const Staff = require('../Model/staff');
const StaffDailyWork = require('../Model/staffDailyWork');

// Assign daily template works to staff
exports.assignTemplateWorks = async (req, res) => {
  try {
    const { staffId, dailyTasks } = req.body;

    // Check if staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Find existing assignment or create new
    let assignment = await StaffWorkAssignment.findOne({ staff: staffId });
    
    if (assignment) {
      // Update existing assignment
      assignment.dailyTasks = dailyTasks;
      assignment.lastUpdated = new Date();
    } else {
      // Create new assignment
      assignment = new StaffWorkAssignment({
        staff: staffId,
        dailyTasks,
      });
    }

    await assignment.save();
    
    res.status(200).json({
      message: 'Work template assigned successfully',
      data: assignment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get staff's template works
exports.getStaffTemplateWorks = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const assignment = await StaffWorkAssignment.findOne({ 
      staff: staffId,
      isActive: true 
    }).populate('staff', 'name role');
    
    if (!assignment) {
      return res.status(404).json({ message: 'No template works found for this staff' });
    }
    
    res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate daily work entry from template
exports.generateDailyWork = async (req, res) => {
  try {
    const { staffId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if daily work already exists for today
    const existingDailyWork = await StaffDailyWork.findOne({
      staff: staffId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingDailyWork) {
      return res.status(400).json({ 
        message: 'Daily work already generated for today' 
      });
    }

    // Get template works
    const template = await StaffWorkAssignment.findOne({ 
      staff: staffId,
      isActive: true 
    });

    if (!template) {
      return res.status(404).json({ 
        message: 'No template works found for this staff' 
      });
    }

    // Create daily work entry from template
    const dailyWork = new StaffDailyWork({
      staff: staffId,
      date: new Date(),
      works: template.dailyTasks.map(task => ({
        taskName: task.taskName,
        status: 'pending',
        remarks: ''
      })),
      overallStatus: 'pending',
      completedPercentage: 0
    });

    await dailyWork.save();
    
    res.status(201).json({
      message: 'Daily work generated successfully',
      data: dailyWork,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update work status
exports.updateWorkStatus = async (req, res) => {
  try {
    const { dailyWorkId } = req.params;
    const { workIndex, status, remarks } = req.body;

    const dailyWork = await StaffDailyWork.findById(dailyWorkId);
    
    if (!dailyWork) {
      return res.status(404).json({ message: 'Daily work not found' });
    }

    // Update specific work
    dailyWork.works[workIndex].status = status;
    dailyWork.works[workIndex].remarks = remarks || '';
    
    if (status === 'completed') {
      dailyWork.works[workIndex].completedAt = new Date();
    }

    // Calculate overall status
    const totalWorks = dailyWork.works.length;
    const completedWorks = dailyWork.works.filter(w => w.status === 'completed').length;
    
    dailyWork.completedPercentage = Math.round((completedWorks / totalWorks) * 100);
    
    if (completedWorks === totalWorks) {
      dailyWork.overallStatus = 'completed';
    } else if (completedWorks > 0) {
      dailyWork.overallStatus = 'partially-completed';
    } else {
      dailyWork.overallStatus = 'pending';
    }

    await dailyWork.save();
    
    res.status(200).json({
      message: 'Work status updated successfully',
      data: dailyWork,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily work for staff
exports.getStaffDailyWork = async (req, res) => {
  try {
    const { staffId, date } = req.params;
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dailyWork = await StaffDailyWork.findOne({
      staff: staffId,
      date: {
        $gte: queryDate,
        $lt: nextDay
      }
    }).populate('staff', 'name role image');
    
    if (!dailyWork) {
      return res.status(404).json({ 
        message: 'No daily work found for this date',
        data: null 
      });
    }
    
    res.status(200).json(dailyWork);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all staffs work status for a date (Admin view)
exports.getAllStaffsDailyWork = async (req, res) => {
  try {
    const { date } = req.query;
    
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dailyWorks = await StaffDailyWork.find({
      date: {
        $gte: queryDate,
        $lt: nextDay
      }
    })
    .populate('staff', 'name role phone email image')
    .sort({ createdAt: -1 });
    
    // Get staff without daily work
    const allStaff = await Staff.find();
    const staffWithWorkIds = dailyWorks.map(dw => dw.staff._id.toString());
    const staffWithoutWork = allStaff.filter(staff => 
      !staffWithWorkIds.includes(staff._id.toString())
    );
    
    res.status(200).json({
      date: queryDate,
      staffsWithWork: dailyWorks,
      staffsWithoutWork: staffWithoutWork.map(staff => ({
        staff,
        message: 'No work assigned for today'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get work history for staff
exports.getStaffWorkHistory = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const history = await StaffDailyWork.find({
      staff: staffId,
      ...dateFilter
    })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .populate('staff', 'name role');
    
    // Calculate statistics
    const stats = {
      totalDays: history.length,
      completedDays: history.filter(d => d.overallStatus === 'completed').length,
      partiallyCompletedDays: history.filter(d => d.overallStatus === 'partially-completed').length,
      pendingDays: history.filter(d => d.overallStatus === 'pending').length,
      averageCompletion: history.length > 0 
        ? Math.round(history.reduce((sum, d) => sum + d.completedPercentage, 0) / history.length)
        : 0
    };
    
    res.status(200).json({
      history,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};