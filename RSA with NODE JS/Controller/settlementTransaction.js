// controllers/settlementTransaction.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const SettlementTransaction = require('../Model/settlementTransaction');

// Create settlement transaction record
exports.createSettlementTransaction = async (req, res) => {
  try {
    const {
      driverId,
      providerId,
      userType,
      settlementDate,
      totalSalary,
      cashInHand,
      balanceAmount,
      advance,
      cashCollection,
      pendingExpenses,
      settlementAmount,
    } = req.body;

    // Validate required fields
    if (!settlementDate || !userType) {
      return res.status(400).json({
        success: false,
        message: "Settlement date and user type are required"
      });
    }

    // Validate user type
    if (!['driver', 'provider'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "User type must be 'driver' or 'provider'"
      });
    }

    // Validate either driver or provider exists
    if (userType === 'driver' && !driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required for driver settlement"
      });
    }

    if (userType === 'provider' && !providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required for provider settlement"
      });
    }

    // Verify user exists
    let user;
    if (userType === 'driver') {
      user = await Driver.findById(driverId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Driver not found"
        });
      }
    } else {
      user = await Provider.findById(providerId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Provider not found"
        });
      }
    }

    // Create settlement transaction
    const settlementTransactionData = {
      [userType]: userType === 'driver' ? driverId : providerId,
      userType,
      settlementDate: new Date(settlementDate),
      totalSalary: totalSalary || 0,
      cashInHand: cashInHand || 0,
      balanceAmount: balanceAmount || 0,
      advance: advance || 0,
      cashCollection: cashCollection || 0,
      pendingExpenses: pendingExpenses || 0,
      settlementAmount: settlementAmount || 0,
      createdBy: req.user?._id
    };

    const settlementTransaction = await SettlementTransaction.create(settlementTransactionData);

    res.status(201).json({
      success: true,
      message: "Settlement transaction recorded successfully",
      data: settlementTransaction
    });

  } catch (error) {
    console.error('Error creating settlement transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating settlement transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all settlement transactions
exports.getSettlementTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userType } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Filter by user type if provided
    if (userType && ['driver', 'provider'].includes(userType)) {
      query.userType = userType;
    }

    // Search functionality
    if (search) {
      // Create search conditions for both drivers and providers
      const matchingDrivers = await Driver.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { idNumber: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const matchingProviders = await Provider.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { idNumber: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { driver: { $in: matchingDrivers.map(d => d._id) } },
        { provider: { $in: matchingProviders.map(p => p._id) } }
      ];
    }

    // Get transactions with population
    const transactions = await SettlementTransaction.find(query)
      .populate('driver', 'name idNumber image')
      .populate('provider', 'name idNumber companyName image')
      .populate('createdBy', 'name')
      .sort({ settlementDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SettlementTransaction.countDocuments(query);

    // Calculate totals
    const totals = await SettlementTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSalary: { $sum: '$totalSalary' },
          totalCashInHand: { $sum: '$cashInHand' },
          totalAdvance: { $sum: '$advance' },
          totalSettlement: { $sum: '$settlementAmount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      totals: totals[0] || {
        totalSalary: 0,
        totalCashInHand: 0,
        totalAdvance: 0,
        totalSettlement: 0
      }
    });

  } catch (error) {
    console.error('Error fetching settlement transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settlement transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};