const Work = require('../Model/work');
const Staff = require('../Model/staff');
const mongoose = require('mongoose');

// Create new work assignment with tasks
exports.createWork = async (req, res) => {
  try {
    const { staff, tasks, notes } = req.body;
    const assignedBy = req.user.id;

    // Validate staff exists
    const staffExists = await Staff.findById(staff);
    if (!staffExists) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    // Validate tasks array
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one task is required'
      });
    }

    // Validate each task
    const validatedTasks = tasks.map(task => ({
      title: task.title.trim(),
      description: task.description?.trim() || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      status: 'pending'
    }));

    // Check if staff already has active work assignment
    const existingActiveWork = await Work.findOne({
      staff,
      overallStatus: 'active'
    });

    if (existingActiveWork) {
      // Add tasks to existing active work
      existingActiveWork.tasks.push(...validatedTasks);
      await existingActiveWork.save();
      
      return res.status(200).json({
        success: true,
        message: 'Tasks added to existing work assignment',
        data: existingActiveWork
      });
    }

    // Create new work assignment
    const work = new Work({
      staff,
      tasks: validatedTasks,
      assignedBy,
      notes: notes?.trim() || '',
      overallStatus: 'active'
    });

    await work.save();

    // Populate staff details
    await work.populate('staff', 'name email phone userName');

    res.status(201).json({
      success: true,
      message: 'Work assignment created successfully',
      data: work
    });
  } catch (error) {
    console.error('Error creating work:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating work assignment',
      error: error.message
    });
  }
};

// Get all work assignments with filtering
exports.getAllWork = async (req, res) => {
  try {
    const {
      staff,
      status,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const query = {};

    // Filter by staff
    if (staff) {
      if (mongoose.Types.ObjectId.isValid(staff)) {
        query.staff = staff;
      }
    }

    // Filter by task status
    if (status) {
      query['tasks.status'] = status;
    }

    // Filter by task priority
    if (priority) {
      query['tasks.priority'] = priority;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filter by overall status
    if (req.query.overallStatus) {
      query.overallStatus = req.query.overallStatus;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { 'tasks.title': { $regex: search, $options: 'i' } },
        { 'tasks.description': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await Work.countDocuments(query);

    // Get work assignments with population
    const work = await Work.find(query)
      .populate('staff', 'name email phone userName image')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: work,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching work assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work assignments',
      error: error.message
    });
  }
};

// Get work by ID
exports.getWorkById = async (req, res) => {
  try {
    const { id } = req.params;

    const work = await Work.findById(id)
      .populate('staff', 'name email phone userName image')
      .populate('assignedBy', 'name email');

    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: work
    });
  } catch (error) {
    console.error('Error fetching work assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work assignment',
      error: error.message
    });
  }
};

// Get work by staff ID
exports.getWorkByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID'
      });
    }

    const work = await Work.find({ staff: staffId })
      .populate('staff', 'name email phone userName image')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate statistics
    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let activeAssignments = 0;

    work.forEach(w => {
      totalTasks += w.tasks.length;
      const completed = w.tasks.filter(t => t.status === 'completed').length;
      const pending = w.tasks.filter(t => t.status === 'pending').length;
      completedTasks += completed;
      pendingTasks += pending;
      if (w.overallStatus === 'active') activeAssignments++;
    });

    res.status(200).json({
      success: true,
      data: work,
      statistics: {
        totalAssignments: work.length,
        activeAssignments,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching staff work:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff work',
      error: error.message
    });
  }
};

// Update work assignment
exports.updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { tasks, notes, overallStatus } = req.body;

    const work = await Work.findById(id);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    // Update tasks if provided
    if (tasks && Array.isArray(tasks)) {
      work.tasks = tasks.map(task => {
        // Find existing task or create new
        const existingTask = work.tasks.id(task._id);
        if (existingTask) {
          // Update existing task
          existingTask.title = task.title || existingTask.title;
          existingTask.description = task.description || existingTask.description;
          existingTask.status = task.status || existingTask.status;
          existingTask.priority = task.priority || existingTask.priority;
          existingTask.dueDate = task.dueDate ? new Date(task.dueDate) : existingTask.dueDate;
          
          // Set completedAt if status changed to completed
          if (task.status === 'completed' && existingTask.status !== 'completed') {
            existingTask.completedAt = new Date();
          }
          
          return existingTask;
        } else {
          // Add new task
          return {
            title: task.title.trim(),
            description: task.description?.trim() || '',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? new Date(task.dueDate) : null
          };
        }
      });
    }

    // Update notes if provided
    if (notes !== undefined) {
      work.notes = notes.trim();
    }

    // Update overall status if provided
    if (overallStatus) {
      work.overallStatus = overallStatus;
    }

    await work.save();

    res.status(200).json({
      success: true,
      message: 'Work assignment updated successfully',
      data: work
    });
  } catch (error) {
    console.error('Error updating work:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating work assignment',
      error: error.message
    });
  }
};

// Update specific task
exports.updateTask = async (req, res) => {
  try {
    const { workId, taskId } = req.params;
    const updates = req.body;

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    const task = work.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Update task fields
    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    
    // Handle status update
    if (updates.status !== undefined && updates.status !== task.status) {
      task.status = updates.status;
      if (updates.status === 'completed') {
        task.completedAt = new Date();
      } else if (task.completedAt && updates.status !== 'completed') {
        task.completedAt = null;
      }
    }

    await work.save();

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

// Delete work assignment
exports.deleteWork = async (req, res) => {
  try {
    const { id } = req.params;

    const work = await Work.findByIdAndDelete(id);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Work assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting work:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting work assignment',
      error: error.message
    });
  }
};

// Delete specific task
exports.deleteTask = async (req, res) => {
  try {
    const { workId, taskId } = req.params;

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({
        success: false,
        message: 'Work assignment not found'
      });
    }

    // Remove task
    work.tasks = work.tasks.filter(task => task._id.toString() !== taskId);
    
    // If no tasks left, delete the work assignment
    if (work.tasks.length === 0) {
      await Work.findByIdAndDelete(workId);
      return res.status(200).json({
        success: true,
        message: 'Work assignment deleted as no tasks remain'
      });
    }

    await work.save();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

// Get work statistics
exports.getWorkStatistics = async (req, res) => {
  try {
    const stats = await Work.aggregate([
      {
        $unwind: '$tasks'
      },
      {
        $group: {
          _id: '$tasks.status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalWork = await Work.countDocuments();
    const activeWork = await Work.countDocuments({ overallStatus: 'active' });
    const staffWithWork = await Work.distinct('staff');

    res.status(200).json({
      success: true,
      data: {
        taskStatus: stats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        totalAssignments: totalWork,
        activeAssignments: activeWork,
        staffWithAssignments: staffWithWork.length
      }
    });
  } catch (error) {
    console.error('Error fetching work statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work statistics',
      error: error.message
    });
  }
};