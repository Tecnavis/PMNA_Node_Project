// controllers/driver.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../Model/driver');
const SettlementTransaction = require('../Model/settlementTransaction');




// Create settlement transaction record
exports.createSettlementTransaction = async (req, res) => {
  try {
    const {
      driverId,
      settlementDate,
      totalSalary,
      cashInHand,
      balanceAmount,
      advance,
      cashCollection,
      pendingExpenses,
      settlementAmount
    } = req.body;

    // Validate required fields
    if (!driverId || !settlementDate) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and settlement date are required"
      });
    }

    // Verify driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    // Create settlement transaction
    const settlementTransaction = await SettlementTransaction.create({
      driver: driverId,
      settlementDate: new Date(settlementDate),
      totalSalary: totalSalary || 0,
      cashInHand: cashInHand || 0,
      balanceAmount: balanceAmount || 0,
      advance: advance || 0,
      cashCollection: cashCollection || 0,
      pendingExpenses: pendingExpenses || 0,
      settlementAmount: settlementAmount || 0,
      createdBy: req.user?._id
    });

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

// Get all settlement transactions - Better approach
exports.getSettlementTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // First find drivers that match search
    let driverMatch = {};
    if (search) {
      const matchingDrivers = await Driver.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { idNumber: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      driverMatch = { driver: { $in: matchingDrivers.map(d => d._id) } };
    }

    const transactions = await SettlementTransaction.find(driverMatch)
      .populate('driver', 'name idNumber image')
      .populate('createdBy', 'name')
      .sort({ settlementDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SettlementTransaction.countDocuments(driverMatch);

    res.status(200).json({
      success: true,
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
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