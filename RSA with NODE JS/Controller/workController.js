// controllers/workController.js
const StaffWorkAssignment = require('../Model/staffWorkAssignment');
const Staff = require('../Model/staff');
const StaffDailyWork = require('../Model/staffDailyWork');

// controllers/workController.js

exports.generateDailyWork = async (req, res) => {
  try {
    const { staffId } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get staff details to know their type
    const staff = await Staff.findById(staffId).select('name role staffType');
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // 2. Check if daily work already exists for today
    const existingWork = await StaffDailyWork.findOne({
      staff: staffId,
      date: { $gte: today }
    });

    if (existingWork) {
      return res.status(200).json({
        message: 'Daily work already exists',
        data: existingWork
      });
    }

    // 3. Fetch template based on staff type
    const template = await StaffWorkAssignment.findOne({ 
      staff: staffId, 
      isActive: true 
    });

    let dailyTasks = [];

    // 4. If no template found, use default tasks based on staff type
    if (!template) {
      dailyTasks = getDefaultTasksByStaffType(staff.staffType || 'operations');
    } else {
      dailyTasks = template.dailyTasks;
    }

    // 5. Create Daily Work Entry with tasks in proper order
    const dailyWork = new StaffDailyWork({
      staff: staffId,
      staffType: staff.staffType || 'operations',
      date: today,
      works: dailyTasks.map((task, index) => ({
        taskName: task.taskName,
        status: 'pending',
        count: task.requiresCount ? 0 : null,
        time: task.estimatedTime || '',
        priority: task.priority || index + 1,
        remarks: ''
      })),
      totalTasks: dailyTasks.length,
      pendingTasks: dailyTasks.length
    });

    await dailyWork.save();

    res.status(201).json({
      message: 'Daily work generated successfully',
      data: dailyWork
    });

  } catch (error) {
    console.error('Error generating daily work:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to generate daily work'
    });
  }
};

// Helper function for default tasks based on staff type
// Update the getDefaultTasksByStaffType function in workController.js

function getDefaultTasksByStaffType(staffType) {
  const defaultTasks = {
    accountant: [  // ASWANI's tasks from image 4
      { taskName: 'COMPANY BILLING', estimatedTime: '10:00 AM', requiresCount: true, priority: 6 },
      { taskName: 'NEW CASE UPDATION IN EXCEL', estimatedTime: '11:00 AM', requiresCount: true, priority: 5 },
      { taskName: 'DRIVERS CASE UPDATION IN EXCEL', estimatedTime: '12:00 PM', requiresCount: true, priority: 4 },
      { taskName: 'INVOICE NUMBER ADD', estimatedTime: '2:00 PM', requiresCount: true, priority: 3 },
      { taskName: 'FUEL BILL CHECKING & TRACKING IN PORTAL', estimatedTime: '3:00 PM', requiresCount: false, priority: 2 },
      { taskName: 'COMPANY CASES ADDED IN EXCEL', estimatedTime: '4:00 PM', requiresCount: true, priority: 1 }
    ],
    operations: [  // VINEETHA's tasks from image 3
      { taskName: 'LOUISIANA', estimatedTime: '9:00 AM', requiresCount: true, priority: 10 },
      { taskName: 'LEAST TRAVELING', estimatedTime: '10:00 AM', requiresCount: true, priority: 6 },
      { taskName: 'REMARKS CHECKING', estimatedTime: '11:00 AM', requiresCount: false, priority: 8 },
      { taskName: 'SUD CHECKING', estimatedTime: '12:00 PM', requiresCount: false, priority: 7 },
      { taskName: 'CALL TO CUSTOMER FOR CASH PENDING', estimatedTime: '2:00 PM', requiresCount: true, priority: 9 },
      { taskName: 'FEDERAL CALLING', estimatedTime: '3:00 PM', requiresCount: true, priority: 5 },
      { taskName: 'NEW ADDE CASES TRANSLATING & CALL TO BOOKING', estimatedTime: '4:00 PM', requiresCount: true, priority: 4 },
      { taskName: 'NIGHT/TOMORROW CASES CLOSING', estimatedTime: '5:00 PM', requiresCount: true, priority: 2 },
      { taskName: 'NIGHT/TOMORROW CASES BOOKING', estimatedTime: '6:00 PM', requiresCount: true, priority: 1 }
    ],
    coordinator: [  // MUNEERA's tasks from image 2
      { taskName: 'CASES CROSS CHECKING FOR', estimatedTime: '9:00 AM', requiresCount: true, priority: 1 },
      { taskName: 'COMPANY BILLING (Group & App)', estimatedTime: '10:00 AM', requiresCount: false, priority: 2 },
      { taskName: 'PAYMENT MANAGEMENT', estimatedTime: '11:00 AM', requiresCount: false, priority: 3 },
      { taskName: 'EXPENSE CHECKING & TRACKING', estimatedTime: '12:00 PM', requiresCount: false, priority: 4 },
      { taskName: 'ACCOUNT TRANSACTION', estimatedTime: '2:00 PM', requiresCount: false, priority: 5 },
      { taskName: 'DRIVER COMPLETED CASES TRACKING', estimatedTime: '3:00 PM', requiresCount: true, priority: 6 },
      { taskName: 'PHOTOS CROSS CHECKING', estimatedTime: '4:00 PM', requiresCount: false, priority: 7 },
      { taskName: 'ACCOUNT STATE VERIFY', estimatedTime: '5:00 PM', requiresCount: false, priority: 8 },
      { taskName: 'CASE UPDATION IN GROUP PORTAL', estimatedTime: '6:00 PM', requiresCount: true, priority: 9 }
    ],
    showroom: [  // SARASWATHI's tasks from image 1
      { taskName: 'CASH PENDING CLOSING', estimatedTime: '9:00 AM', requiresCount: true, priority: 10 },
      { taskName: 'INVOICE AMOUNT ADJ', estimatedTime: '10:00 AM', requiresCount: false, priority: 9 },
      { taskName: 'SHOWROOM ADJ', estimatedTime: '11:00 AM', requiresCount: false, priority: 8 },
      { taskName: 'SPECIAL TAX & INSURANCE', estimatedTime: '12:00 PM', requiresCount: false, priority: 7 },
      { taskName: 'DUE DATE TRACKING & PROCEDURE', estimatedTime: '2:00 PM', requiresCount: false, priority: 6 },
      { taskName: 'DRIVER COMPLETE CLASS SERVICE', estimatedTime: '3:00 PM', requiresCount: true, priority: 5 },
      { taskName: 'NEW ADDE CLASS START', estimatedTime: '4:00 PM', requiresCount: true, priority: 4 },
      { taskName: 'PENCING CLASS CLOSING', estimatedTime: '5:00 PM', requiresCount: true, priority: 3 },
      { taskName: 'NIGHT/TOMORROW CLASS BOOKING ADJ', estimatedTime: '6:00 PM', requiresCount: true, priority: 2 },
      { taskName: 'NET ADDED CLASS SERVICE', estimatedTime: '7:00 PM', requiresCount: true, priority: 1 }
    ]
  };

  return defaultTasks[staffType] || defaultTasks.operations;
}
// Update task status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { dailyWorkId, taskIndex, status, count, remarks } = req.body;
    
    const dailyWork = await StaffDailyWork.findById(dailyWorkId);
    if (!dailyWork) {
      return res.status(404).json({ message: 'Daily work not found' });
    }

    // Update specific task
    if (dailyWork.works[taskIndex]) {
      const task = dailyWork.works[taskIndex];
      task.status = status;
      if (count !== undefined) task.count = count;
      if (remarks) task.remarks = remarks;
      
      if (status === 'in-progress' && !task.startTime) {
        task.startTime = new Date();
      } else if (status === 'completed' && !task.endTime) {
        task.endTime = new Date();
      }
    }

    // Update counters
    dailyWork.completedTasks = dailyWork.works.filter(t => t.status === 'completed').length;
    dailyWork.pendingTasks = dailyWork.works.filter(t => t.status === 'pending').length;
    dailyWork.updatedAt = new Date();

    await dailyWork.save();

    res.status(200).json({
      message: 'Task updated successfully',
      data: dailyWork
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily work report
exports.getDailyReport = async (req, res) => {
  try {
    const { date, staffType } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const filter = { date: { $gte: queryDate } };
    if (staffType) filter.staffType = staffType;

    const reports = await StaffDailyWork.find(filter)
      .populate('staff', 'name email phone')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      totalStaff: reports.length,
      totalTasks: reports.reduce((sum, report) => sum + report.totalTasks, 0),
      completedTasks: reports.reduce((sum, report) => sum + report.completedTasks, 0),
      pendingTasks: reports.reduce((sum, report) => sum + report.pendingTasks, 0),
      completionRate: reports.length > 0 ? 
        (reports.reduce((sum, report) => sum + report.completedTasks, 0) / 
         reports.reduce((sum, report) => sum + report.totalTasks, 0) * 100).toFixed(2) : 0
    };

    res.status(200).json({
      message: 'Daily report fetched successfully',
      data: reports,
      statistics: stats,
      date: queryDate.toISOString().split('T')[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// controllers/workController.js - Additional endpoints
// Add these to your workController.js

// Get staff list with type
exports.getStaffList = async (req, res) => {
  try {
    const staff = await Staff.find({ 
      isActive: true 
    })
    .populate('role', 'name')
    .select('name email phone role staffType userName')
    .lean();
    
    // Transform the data to include staffType
    const staffList = staff.map(staffMember => ({
      _id: staffMember._id,
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      staffType: staffMember.staffType || getStaffTypeFromRole(staffMember.role?.name),
      roleName: staffMember.role?.name
    }));
    
    res.status(200).json(staffList);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch staff list' 
    });
  }
};

// Helper function to determine staffType from role
function getStaffTypeFromRole(roleName) {
  if (!roleName) return 'operations';
  
  const roleMap = {
    'Accountant': 'accountant',
    'Operations': 'operations', 
    'Coordinator': 'coordinator',
    'Showroom': 'showroom',
    'Admin': 'admin'
  };
  
  return roleMap[roleName] || 'operations';
}

// Get daily report by date
exports.getDailyReportByDate = async (req, res) => {
  try {
    const { date, staffId } = req.query;
    
    // Set date range for the entire day
    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = { 
      date: { 
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    if (staffId) {
      filter.staff = staffId;
    }

    const dailyWorks = await StaffDailyWork.find(filter)
      .populate('staff', 'name email phone staffType')
      .sort({ 'staff.name': 1 });

    res.status(200).json({
      success: true,
      count: dailyWorks.length,
      data: dailyWorks,
      date: queryDate.toISOString().split('T')[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// Generate daily work for all staff
exports.generateAllDailyWork = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active staff
    const staffList = await Staff.find({ isActive: true }).select('_id name staffType');
    
    const results = [];
    
    for (const staff of staffList) {
      try {
        // Check if daily work already exists for today
        const existingWork = await StaffDailyWork.findOne({
          staff: staff._id,
          date: { $gte: today }
        });

        if (!existingWork) {
          // Get template or default tasks
          const template = await StaffWorkAssignment.findOne({ 
            staff: staff._id, 
            isActive: true 
          });

          let dailyTasks = [];

          if (!template) {
            // Use default tasks based on staff type
            dailyTasks = getDefaultTasksByStaffType(staff.staffType || 'operations');
          } else {
            dailyTasks = template.dailyTasks;
          }

          // Create Daily Work Entry
          const dailyWork = new StaffDailyWork({
            staff: staff._id,
            staffType: staff.staffType || 'operations',
            date: today,
            works: dailyTasks.map((task, index) => ({
              taskName: task.taskName,
              status: 'pending',
              count: task.requiresCount ? 0 : null,
              time: task.estimatedTime || '',
              priority: task.priority || index + 1,
              remarks: ''
            })),
            totalTasks: dailyTasks.length,
            pendingTasks: dailyTasks.length
          });

          await dailyWork.save();
          results.push({ 
            staff: staff.name, 
            status: 'created', 
            workId: dailyWork._id,
            tasks: dailyTasks.length
          });
        } else {
          results.push({ 
            staff: staff.name, 
            status: 'already_exists',
            tasks: existingWork.totalTasks
          });
        }
      } catch (staffError) {
        results.push({ 
          staff: staff.name, 
          status: 'error', 
          error: staffError.message 
        });
      }
    }

    const createdCount = results.filter(r => r.status === 'created').length;
    const existingCount = results.filter(r => r.status === 'already_exists').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.status(200).json({
      message: `Daily work generation completed: ${createdCount} created, ${existingCount} already existed, ${errorCount} errors`,
      results,
      summary: {
        totalStaff: staffList.length,
        created: createdCount,
        alreadyExists: existingCount,
        errors: errorCount
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Failed to generate daily work for all staff' 
    });
  }
};

// Get daily report by date
exports.getDailyReportByDate = async (req, res) => {
  try {
    const { date, staffId } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    const filter = { 
      date: { $gte: queryDate },
      ...(staffId && { staff: staffId })
    };

    const dailyWorks = await StaffDailyWork.find(filter)
      .populate('staff', 'name email phone staffType')
      .sort({ 'staff.name': 1 });

    res.status(200).json(dailyWorks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add custom task to staff
exports.addCustomTask = async (req, res) => {
  try {
    const { staffId, taskName, time, priority, isCustom } = req.body;
    
    const dailyWork = await StaffDailyWork.findOne({ 
      staff: staffId,
      date: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    if (!dailyWork) {
      return res.status(404).json({ message: 'Daily work not found for today' });
    }

    const newTask = {
      taskName,
      status: 'pending',
      time: time || '',
      priority: priority || dailyWork.works.length + 1,
      isCustom: isCustom || false
    };

    dailyWork.works.push(newTask);
    dailyWork.totalTasks = dailyWork.works.length;
    dailyWork.pendingTasks = dailyWork.works.filter(t => t.status === 'pending').length;
    
    await dailyWork.save();

    res.status(200).json({ 
      message: 'Task added successfully', 
      task: newTask 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update task details
exports.updateTaskDetails = async (req, res) => {
  try {
    const { staffId, taskIndex, taskName, time, status } = req.body;
    
    const dailyWork = await StaffDailyWork.findOne({ 
      staff: staffId,
      date: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    if (!dailyWork || !dailyWork.works[taskIndex]) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = dailyWork.works[taskIndex];
    
    if (taskName !== undefined) task.taskName = taskName;
    if (time !== undefined) task.time = time;
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed' && !task.endTime) {
        task.endTime = new Date();
      }
    }

    // Recalculate stats
    dailyWork.completedTasks = dailyWork.works.filter(t => t.status === 'completed').length;
    dailyWork.pendingTasks = dailyWork.works.filter(t => t.status === 'pending').length;
    
    await dailyWork.save();

    res.status(200).json({ 
      message: 'Task updated successfully', 
      task 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete custom task
exports.deleteTask = async (req, res) => {
  try {
    const { staffId, taskIndex } = req.body;
    
    const dailyWork = await StaffDailyWork.findOne({ 
      staff: staffId,
      date: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    if (!dailyWork || !dailyWork.works[taskIndex]) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = dailyWork.works[taskIndex];
    
    // Only allow deletion of custom tasks
    if (!task.isCustom) {
      return res.status(400).json({ 
        message: 'Cannot delete permanent template tasks' 
      });
    }

    dailyWork.works.splice(taskIndex, 1);
    dailyWork.totalTasks = dailyWork.works.length;
    dailyWork.completedTasks = dailyWork.works.filter(t => t.status === 'completed').length;
    dailyWork.pendingTasks = dailyWork.works.filter(t => t.status === 'pending').length;
    
    await dailyWork.save();

    res.status(200).json({ 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// controllers/workController.js - Add these functions

// Get all staff templates
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await StaffWorkAssignment.find({ isActive: true })
      .populate('staff', 'name email phone staffType')
      .sort({ 'staff.name': 1 });

    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get template by staff ID
exports.getTemplateByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    
    const template = await StaffWorkAssignment.findOne({ 
      staff: staffId, 
      isActive: true 
    }).populate('staff', 'name email phone staffType');

    if (!template) {
      return res.status(404).json({ 
        message: 'No template found for this staff member' 
      });
    }

    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create or update template
exports.saveTemplate = async (req, res) => {
  try {
    const { staff, staffType, dailyTasks, isActive } = req.body;

    // Check if template exists
    let template = await StaffWorkAssignment.findOne({ staff });

    if (template) {
      // Update existing template
      template.staffType = staffType;
      template.dailyTasks = dailyTasks;
      template.isActive = isActive !== undefined ? isActive : true;
    } else {
      // Create new template
      template = new StaffWorkAssignment({
        staff,
        staffType,
        dailyTasks,
        isActive: isActive !== undefined ? isActive : true
      });
    }

    await template.save();

    res.status(200).json({
      message: 'Template saved successfully',
      data: template
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await StaffWorkAssignment.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Soft delete
    template.isActive = false;
    await template.save();

    res.status(200).json({ 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};