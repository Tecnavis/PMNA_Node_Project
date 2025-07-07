const CashCollectionDetails = require('../Model/cashCollectionDetails');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const Booking = require('../Model/booking');
const mongoose = require('mongoose');

exports.createCashCollectionDetails = async (req, res) => {
  try {
    const { 
      driver, 
      provider, 
      receivedAmount, 
      remark, 
      totalAmount,
      currentCashInHand
    } = req.body;
        const userId = req.user.id || req.user._id;
        const receivedUser = req.user.role || 'Admin';

        // Validate inputs
        if ((!driver && !provider) || !receivedAmount || !remark || !totalAmount || currentCashInHand === undefined) {
             return res.status(400).json({ 
        success: false,
        message: 'Provider/driver, amount and totalAmount are required',
        requiredFields: ['provider|driver', 'receivedAmount', 'totalAmount']
      });
        }

        // Ensure only one of driverId or providerId is provided
        if (driver && provider) {
            return res.status(400).json({
                message: 'Cannot specify both driverId and providerId'
            });
        }

        const amount = Number(receivedAmount);
        const total = Number(totalAmount);
        const cashInHand = Number(currentCashInHand);
        
        if (isNaN(amount) || isNaN(total) || isNaN(cashInHand)) {
            return res.status(400).json({ 
                message: 'Amount, totalAmount and currentCashInHand must be valid numbers' 
            });
        }

        // Determine if we're working with driver or provider
        const isDriver = !!driver;
        const entityId = isDriver ? driver : provider;
        const entityModel = isDriver ? Driver : Provider;
        const entityField = isDriver ? 'driver' : 'provider';

        // Verify entity exists (but don't modify anything)
        const entity = await entityModel.findById(entityId);
        if (!entity) {
            return res.status(404).json({ 
                message: isDriver ? 'Driver not found' : 'Provider not found' 
            });
        }

        // Create cash collection record only
        const cashCollectionData = {
            [entityField]: entityId,
            balance: (cashInHand - total).toString(),
            currentCashInHand: cashInHand,
            totalDriverAmount: total,
            receivedAmount: amount,
            receivedUser,
            receivedUserId: new mongoose.Types.ObjectId(userId),
            remark
        };

        const cashCollection = await CashCollectionDetails.create(cashCollectionData);
        
        res.status(201).json({
            message: 'Cash collection recorded successfully',
            data: cashCollection
        });

    } catch (error) {
        console.error('Error in createCashCollectionDetails:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user
        });
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

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