const CompanyExpense = require('../Model/companyExpense');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');
const cloudinary = require('../config/cloudinary');
// --------------------------------------------------
// Create new company expense
// In your companyExpenseController.js - update createCompanyExpense function
const createCompanyExpense = asyncErrorHandler(async (req, res) => {
  console.log('=== CREATE COMPANY EXPENSE CALLED ===');
  console.log('Request Body:', req.body);
  console.log('Request File:', req.file);
  
  try {
    const { title, description, category, amount, vendor, employee } = req.body;

    // Enhanced validation with specific error messages
    if (!title) throw new BadRequestError('Title is required');
    if (!description) throw new BadRequestError('Description is required');
    if (!category) throw new BadRequestError('Category is required');
    if (!amount) throw new BadRequestError('Amount is required');

    // Validate amount is a number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      throw new BadRequestError('Amount must be a valid number');
    }

    let imageFilename = null;
    let cloudinaryError = null;

    // Handle single image upload with simplified approach
    if (req.file) {
      console.log('Processing file upload...');
      try {
        // Simple upload without complex retry logic first
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'company-expenses',
          timeout: 15000 // Reduced timeout
        });
        
        imageFilename = result.public_id;
        console.log('Image uploaded successfully');
        
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        console.log('Continuing without image');
        imageFilename = null;
        cloudinaryError = uploadError;
      }
    }

    console.log('Creating expense in database...');

    // Create expense with single image field
    const expense = await CompanyExpense.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      amount: amountNum,
      vendor: vendor ? vendor.trim() : '',
      employee: employee ? employee.trim() : '',
      image: imageFilename
    });

    console.log('Expense created successfully:', expense._id);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Company expense created successfully',
      data: expense
    });

  } catch (error) {
    console.error('=== BACKEND 500 ERROR DETAILS ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Full error object:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      console.error('Mongoose validation error:', error.errors);
      throw new BadRequestError('Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', '));
    }
    
    if (error.name === 'MongoServerError') {
      console.error('MongoDB error:', error);
      if (error.code === 11000) {
        throw new BadRequestError('Duplicate expense ID detected');
      }
    }
    
    // Generic error
    console.error('Unhandled error type:', typeof error);
    throw new BadRequestError('Failed to create expense: ' + error.message);
  }
});
// Get all company expenses with filters and pagination
const getCompanyExpenses = asyncErrorHandler(async (req, res) => {
  const {
    month,
    year,
    category,
    employee,
    page = 1,
    limit = 10,
    showAll = false
  } = req.query;

  // Build filter object
  let filter = {};

  // Date filtering
  if (month && year) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    filter.createdAt = {
      $gte: startDate,
      $lt: endDate
    };
  } else if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);
    
    filter.createdAt = {
      $gte: startDate,
      $lt: endDate
    };
  }

  if (category) {
    filter.category = category;
  }

  if (employee) {
    filter.employee = employee;
  }

  // Pagination setup
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  let expenses, total;

  if (showAll === 'true') {
    // Get all expenses without pagination
    expenses = await CompanyExpense.find(filter).sort({ createdAt: -1 });
    total = expenses.length;
  } else {
    // Get paginated expenses
    [expenses, total] = await Promise.all([
      CompanyExpense.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CompanyExpense.countDocuments(filter)
    ]);
  }

  const totalPages = showAll === 'true' ? 1 : Math.ceil(total / limitNum);

  res.status(StatusCodes.OK).json({
    success: true,
    data: expenses,
    total,
    totalPages,
    currentPage: pageNum,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  });
});

// Get company expense by ID
const getCompanyExpenseById = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await CompanyExpense.findById(id);

  if (!expense) {
    throw new NotFoundError('Company expense not found');
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: expense
  });
});

// Update company expense - FIXED: Now uses single image
const updateCompanyExpense = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, category, amount, vendor, employee } = req.body;

  const expense = await CompanyExpense.findById(id);
  if (!expense) {
    throw new NotFoundError('Company expense not found');
  }

  // Handle image upload if new image is provided
  let imageFilename = expense.image; // Keep existing image by default
  if (req.file) {
    try {
      // Delete old image from Cloudinary if exists
      if (expense.image) {
        await cloudinary.uploader.destroy(expense.image);
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'company-expenses'
      });
      
      imageFilename = result.public_id;
      console.log('Image updated successfully:', imageFilename);
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      throw new BadRequestError('Failed to upload image');
    }
  }

  const updateData = {
    ...(title && { title }),
    ...(description && { description }),
    ...(category && { category }),
    ...(amount && { amount: parseFloat(amount) }),
    ...(vendor !== undefined && { vendor }),
    ...(employee !== undefined && { employee }),
    image: imageFilename
  };

  const updatedExpense = await CompanyExpense.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Company expense updated successfully',
    data: updatedExpense
  });
});

// Approve/Reject company expense - FIXED: Removed populate calls
const updateExpenseStatus = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const staffId = req.staff?._id;

  if (!['Approved', 'Rejected'].includes(status)) {
    throw new BadRequestError('Status must be either Approved or Rejected');
  }

  const expense = await CompanyExpense.findById(id);
  if (!expense) {
    throw new NotFoundError('Company expense not found');
  }

  const updateData = {
    status,
    ...(status === 'Approved' && {
      approvedBy: staffId,
      approvedAt: new Date(),
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null
    }),
    ...(status === 'Rejected' && {
      rejectedBy: staffId,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason || '',
      approvedBy: null,
      approvedAt: null
    })
  };

  const updatedExpense = await CompanyExpense.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: `Company expense ${status.toLowerCase()} successfully`,
    data: updatedExpense
  });
});

// Delete company expense - FIXED: Now uses single image
const deleteCompanyExpense = asyncErrorHandler(async (req, res) => {
  const { id } = req.params;

  const expense = await CompanyExpense.findById(id);
  if (!expense) {
    throw new NotFoundError('Company expense not found');
  }

  // Delete image from Cloudinary if exists
  if (expense.image) {
    try {
      await cloudinary.uploader.destroy(expense.image);
      console.log('Image deleted from Cloudinary:', expense.image);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
  }

  await CompanyExpense.findByIdAndDelete(id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Company expense deleted successfully'
  });
});

// Get expense statistics - FIXED: Uses single image schema
const getExpenseStats = asyncErrorHandler(async (req, res) => {
  const { year, month } = req.query;

  let matchStage = {};
  
  if (year && month) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    matchStage.createdAt = { $gte: startDate, $lt: endDate };
  } else if (year) {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);
    matchStage.createdAt = { $gte: startDate, $lt: endDate };
  }

  const stats = await CompanyExpense.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$totalAmount' },
        categoryBreakdown: { $push: { category: '$_id', totalAmount: '$totalAmount', count: '$count' } },
        expenseCount: { $sum: '$count' }
      }
    },
    {
      $project: {
        _id: 0,
        totalExpenses: 1,
        expenseCount: 1,
        categoryBreakdown: 1
      }
    }
  ]);

  const statusStats = await CompanyExpense.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      summary: stats[0] || { totalExpenses: 0, expenseCount: 0, categoryBreakdown: [] },
      statusStats
    }
  });
});

// Upload image function
const uploadImage = asyncErrorHandler(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError("No file uploaded");
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'company-expenses'
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: result.public_id, // Use Cloudinary public_id as filename
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    throw new BadRequestError('Failed to upload image');
  }
});

// Export all functions
module.exports = {
  createCompanyExpense,
  getCompanyExpenses,
  getCompanyExpenseById,
  updateCompanyExpense,
  updateExpenseStatus,
  deleteCompanyExpense,
  getExpenseStats,
  uploadImage
};