const CashCollectionDetails = require('../Model/cashCollectionDetails');
const Driver = require('../Model/driver');
const Booking = require('../Model/booking');
const mongoose = require('mongoose');

exports.createCashCollectionDetails = async (req, res) => {
    try {
        const { driverId, receivedAmount, remark, totalDriverAmount, currentCashInHand } = req.body;
        const userId = req.user.id || req.user._id;
        const receivedUser = req.user.role || 'Admin';

        // Validate inputs
        if (!driverId || !receivedAmount || !remark || !totalDriverAmount || currentCashInHand === undefined) {
            return res.status(400).json({ 
                message: 'Driver ID, amount, remark, totalDriverAmount and currentCashInHand are required' 
            });
        }

        const amount = Number(receivedAmount);
        const totalAmount = Number(totalDriverAmount);
        const cashInHand = Number(currentCashInHand);
        
        if (isNaN(amount) || isNaN(totalAmount) || isNaN(cashInHand)) {
            return res.status(400).json({ 
                message: 'Amount, totalDriverAmount and currentCashInHand must be valid numbers' 
            });
        }

        // Verify driver exists (but don't modify anything)
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Create cash collection record only
        const cashCollection = await CashCollectionDetails.create({
            driver: driverId,
            balance: (cashInHand - totalAmount).toString(),
            currentCashInHand: cashInHand,
            totalDriverAmount: totalAmount,
            receivedAmount: amount,
            receivedUser,
            receivedUserId: new mongoose.Types.ObjectId(userId),
            remark
        });
        
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
        const { search, driverId, month, year } = req.query;
        const query = {};

        // Driver filter
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
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

            // Search in driver names
            const matchingDrivers = await Driver.find({ name: regex }).select('_id').lean();
            if (matchingDrivers.length > 0) {
                searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
            }

            query.$or = searchConditions;
        }

        // Fetch data with population
        const cashCollections = await CashCollectionDetails.find(query)
            .sort({ createdAt: -1 })
            .populate({
                path: 'driver',
                select: 'name' // Only include driver name
            })
            .populate({
                path: 'receivedUserId',
                select: 'name' // Include staff/admin name if needed
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