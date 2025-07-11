const CashCollectionDetails = require('../Model/cashCollectionDetails');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const Booking = require('../Model/booking');
const mongoose = require('mongoose');

exports.createCashCollectionDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      driverId, 
      providerId, 
      receivedAmount, 
      remark, 
      totalDriverAmount,
      currentCashInHand
    } = req.body;

    const userId = req.user.id || req.user._id;
    const receivedUser = req.user.role || 'Admin';

    // ===== 1. VALIDATION (Atomic Checks) =====
    if ((!driverId && !providerId) || !receivedAmount || !remark || !totalDriverAmount || currentCashInHand === undefined) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        requiredFields: ['provider|driver', 'receivedAmount', 'totalAmount', 'currentCashInHand']
      });
    }

    if (driverId && providerId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Specify either driverId OR providerId' });
    }

    // ===== 2. TYPE SAFETY =====
    const amount = Number(receivedAmount);
    const totalAmount = Number(totalDriverAmount);
    const cashInHand = Number(currentCashInHand);
    
    if (isNaN(amount) || isNaN(totalAmount) || isNaN(cashInHand)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        code: 'INVALID_NUMERIC_VALUE',
        message: 'All amounts must be valid numbers' 
      });
    }

    // ===== 3. ENTITY VERIFICATION =====
    const isDriver = !!driverId;
    const entityId = isDriver ? driverId : providerId;
    const entityModel = isDriver ? Driver : Provider;
    const entityField = isDriver ? 'driver' : 'provider';

    const entity = await entityModel.findById(entityId).session(session);
    if (!entity) {
      await session.abortTransaction();
      return res.status(404).json({ 
        code: 'ENTITY_NOT_FOUND',
        message: isDriver ? 'Driver not found' : 'Provider not found' 
      });
    }

    // ===== 4. TRANSACTIONAL OPERATIONS =====
    const cashCollectionData = {
      [entityField]: entityId,
      balance: (cashInHand - totalAmount).toString(),
      currentCashInHand: cashInHand,
      totalDriverAmount: totalAmount,
      receivedAmount: amount,
      receivedUser,
      receivedUserId: new mongoose.Types.ObjectId(userId),
      remark,
      status: 'PROCESSED' // Audit field
    };

    const cashCollection = await CashCollectionDetails.create([cashCollectionData], { session });
    
    // ===== 5. COMMIT & RESPONSE =====
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: cashCollection[0],
      audit: {
        transactionId: session.id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    // ===== 6. TRANSACTION ROLLBACK =====
    await session.abortTransaction();
    
    // Classified Error Handling
    if (isNetworkError(error)) {
      console.error('Network failure during cash collection:', {
        error: error.message,
        sessionId: session?.id,
        userId: req.user?.id
      });
      
      return res.status(503).json({
        code: 'NETWORK_FAILURE',
        message: 'Temporary service disruption. Please retry.',
        retryable: true
      });
    }

    // Business Logic Errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 'VALIDATION_FAILED',
        fields: Object.keys(error.errors),
        message: 'Data validation failed'
      });
    }

    // Unknown Errors
    console.error('Fatal error in cash collection:', {
      error: error.message,
      stack: error.stack,
      sessionId: session?.id,
      body: req.body
    });

    res.status(500).json({
      code: 'FATAL_SERVER_ERROR',
      message: 'Critical failure. Contact support.',
      referenceId: session?.id // For debugging
    });
  } finally {
    // ===== 7. RESOURCE CLEANUP =====
    session.endSession();
  }
};

// Reusable error classifier
function isNetworkError(error) {
  return error.message.includes('network') || 
         error.message.includes('ECONN') || 
         error.message.includes('timeout') ||
         error.name === 'MongoNetworkError';
}

exports.getAllCashCollectionDetails = async (req, res) => {
    try {
        const { search, driverId, providerId, month, year } = req.query;
        const query = {};

        // Entity filter
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        } else if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // Date filters
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Search functionality
        if (search && search.trim()) {
            const searchQuery = search.trim();
            const regex = new RegExp(searchQuery, 'i');

            const searchConditions = [
                { remark: regex },
                { balance: regex }
            ];

            // Search in driver and provider names
            const [matchingDrivers, matchingProviders] = await Promise.all([
                Driver.find({ name: regex }).select('_id').lean(),
                Provider.find({ name: regex }).select('_id').lean()
            ]);

            if (matchingDrivers.length > 0) {
                searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
            }
            if (matchingProviders.length > 0) {
                searchConditions.push({ provider: { $in: matchingProviders.map(p => p._id) } });
            }

            query.$or = searchConditions;
        }

        // Fetch data with population
        const cashCollections = await CashCollectionDetails.find(query)
            .sort({ createdAt: -1 })
            .populate({
                path: 'driver',
                select: 'name'
            })
            .populate({
                path: 'provider',
                select: 'name'
            })
            .populate({
                path: 'receivedUserId',
                select: 'name'
            });

        res.status(200).json(cashCollections);
    } catch (error) {
        console.error('Error in getAllCashCollectionDetails:', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

exports.getCashCollectionDetailsByStaffId = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { month, year, page = 1, pageSize = 10, driverId, providerId } = req.query;

        // Validate staffId
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: 'Invalid staff ID' });
        }

        const query = { 
            receivedUserId: new mongoose.Types.ObjectId(staffId) 
        };

        // Add driver/provider filter if provided
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        } else if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // Date filters
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Calculate skip value for pagination
        const skip = (page - 1) * pageSize;

        // Get total count of documents
        const totalRecords = await CashCollectionDetails.countDocuments(query);

        // Get paginated data
        const cashCollections = await CashCollectionDetails.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(pageSize))
            .populate({
                path: 'driver',
                select: 'name'
            })
            .populate({
                path: 'provider',
                select: 'name'
            })
            .populate({
                path: 'receivedUserId',
                select: 'name'
            });

        if (!cashCollections || cashCollections.length === 0) {
            return res.status(404).json({ 
                message: 'No cash collection records found for this staff member' 
            });
        }

        res.status(200).json({
            data: cashCollections,
            pagination: {
                total: totalRecords,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(totalRecords / pageSize)
            }
        });
    } catch (error) {
        console.error('Error in getCashCollectionDetailsByStaffId:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};