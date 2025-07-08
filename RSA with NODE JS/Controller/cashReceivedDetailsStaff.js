const mongoose = require('mongoose');
const CashCollectionDetailsStaff = require('../Model/cashReceivedDetailsStaff');
const Staff = require('../Model/staff');
const Booking = require('../Model/booking.js')
const ReceivedDetails = require('../Model/ReceivedDetails.js')

exports.createReceivedDetailsStaff = async (req, res) => {
    try {
        const { 
            staffId, 
            givenAmountToStaff, 
            remark,
            totalStaffAmount,
            driver,
            provider
        } = req.body;
        
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;

        // Validate all required fields
        if (!staffId || !givenAmountToStaff || givenAmountToStaff <= 0 || 
            !totalStaffAmount || totalStaffAmount <= 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Staff ID, given amount, and total amount are required and must be positive'
            });
        }

        

        // Check staff exists
        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        // Calculate balance and current cash in hand
        const currentCashInHand = staff.cashInHand || 0;
        const newBalance = currentCashInHand - Number(givenAmountToStaff);

        let remainingAmount = Number(givenAmountToStaff);
        const selectedBookingIds = [];
        const appliedAmounts = [];
        let advanceDeductionApplied = 0;

        // Determine if we're working with driver or provider
        const isDriver = !!driver;
        const entityId = isDriver ? driver : provider;
        const entityField = isDriver ? 'driver' : 'provider';

        // 1. First try to distribute to bookings
        const bookings = await Booking.find({
            status: 'Order Completed',
           
            $and: [
                {
                    $or: [
                        // Current staff payments (partial or unpaid)
                        {
                            receivedUser: 'Staff',
                            receivedUserId: staffId,
                            $or: [
                                { partialReceivedAmountStaff: true },
                                { $expr: { $gt: ["$totalAmount", "$receivedAmountStaff"] } }
                            ]
                        },
                        // Previously staff-handled payments now with admin
                        {
                            previousReceivedUser: 'Staff',
                            previousReceivedUserId: staffId,
                            $expr: { $gt: ["$totalAmount", "$receivedAmountStaff"] }
                        }
                    ]
                }
            ]
        }).sort({ createdAt: 1 });

        // In the bookings loop:
        for (const booking of bookings) {
            if (remainingAmount <= 0) break;

            let receivableAmount = 0;
            
            // For current staff payments
            if (booking.receivedUser === 'Staff' && booking.receivedUserId.equals(staffId)) {
                receivableAmount = (booking.receivedAmountStaff || 0) - (booking.givenAmountByStaff || 0);
            } 
            // For previously staff-handled payments
            else if (booking.previousReceivedUser === 'Staff' && booking.previousReceivedUserId.equals(staffId)) {
                receivableAmount = (booking.receivedAmount || 0) - (booking.givenAmountByStaff || 0);
            }

            if (receivableAmount > 0) {
                const amountToApply = Math.min(remainingAmount, receivableAmount);
                
                // Update only for current staff payments
                booking.givenAmountByStaff = (booking.givenAmountByStaff || 0) + amountToApply;
                
                // Update payment status
                const totalReceived = booking.receivedAmount || 0;
                booking.partialReceivedAmountStaff = totalReceived < booking.totalAmount;
                
                if (Math.abs(totalReceived - booking.totalAmount) < 0.01) {
                    booking.cashPending = false;
                }

                remainingAmount -= amountToApply;
                selectedBookingIds.push(booking._id);
                appliedAmounts.push(amountToApply);
                await booking.save();
            }
        }

        // 2. If there's remaining amount, deduct from Advance Deduction records
        if (remainingAmount > 0) {
            const advanceRecords = await ReceivedDetails.find({
                fileNumber: "Advance Deduction",
                [entityField]: entityId,
                $or: [
                    { receivedUser: 'Staff', receivedUserId: staffId },
                    { previousReceivedUser: 'Staff', previousReceivedUserId: staffId }
                ]
            }).sort({ createdAt: 1 });

            for (const record of advanceRecords) {
                if (remainingAmount <= 0) break;
                
                const receivableAmount = record.receivedAmount - (record.givenAmountByStaff || 0);
                if (receivableAmount > 0) {
                    const amountToDeduct = Math.min(remainingAmount, receivableAmount);
                    
                    record.givenAmountByStaff = (record.givenAmountByStaff || 0) + amountToDeduct;
                    advanceDeductionApplied += amountToDeduct;
                    remainingAmount -= amountToDeduct;
                    
                    await record.save();
                }
            }
        }

        // Create cash collection record
        const cashCollectionData = {
            balance: newBalance.toString(),
            currentCashInHand,
            totalStaffAmount: Number(totalStaffAmount),
            receivedUserId: userId,
            staff: staffId,
            [entityField]: entityId,
            givenAmountToStaff: Number(givenAmountToStaff),
            remark: remark || 'No remarks provided',
            processedBookings: selectedBookingIds,
            appliedAmounts,
            advanceDeductionApplied,
            remainingAmount
        };

        const cashCollectionDetail = await CashCollectionDetailsStaff.create(cashCollectionData);

        // Update staff's cash in hand
        staff.cashInHand = newBalance;
        await staff.save();
        
        res.status(201).json({
            success: true,
            message: 'Staff cash collection recorded successfully',
            data: cashCollectionDetail,
            staff: {
                id: staff._id,
                name: staff.name,
                newBalance: staff.cashInHand
            },
            distribution: {
                bookings: {
                    count: selectedBookingIds.length,
                    amounts: appliedAmounts
                },
                advanceDeductionApplied,
                remainingAmount
            }
        });

    } catch (error) {
        console.error('Error in createReceivedDetailsStaff:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to record staff cash collection',
            error: error.message 
        });
    }
};

exports.getReceivedDetailsStaff = async (req, res) => {
    try {
        const { staffId, driver, provider, search, page = 1, pageSize = 10 } = req.query;
        
        const query = {};
        if (staffId) query.staff = staffId;
        
        // Handle driver or provider filtering
        if (driver) {
            query.driver = driver;
        } else if (provider) {
            query.provider = provider;
        }

        if (search) {
            query.$or = [
                { remark: { $regex: search, $options: 'i' } },
                { 'staff.name': { $regex: search, $options: 'i' } },
                { 'driver.name': { $regex: search, $options: 'i' } },
                { 'provider.name': { $regex: search, $options: 'i' } }
            ];
        }

        // Get paginated results
        const skip = (page - 1) * pageSize;
        const total = await CashCollectionDetailsStaff.countDocuments(query);
        const details = await CashCollectionDetailsStaff.find(query)
            .populate('staff', 'name')
            .populate('receivedUserId', 'name')
            .populate('driver', 'name')
            .populate('provider', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(pageSize));

        // Calculate totals
        const totals = await CashCollectionDetailsStaff.aggregate([
            { $match: query },
            { 
                $group: {
                    _id: null,
                    totalDriverGiven: { $sum: "$totalStaffAmount" },
                    totalStaffGiven: { $sum: "$givenAmountToStaff" },
                    totalBalance: { $sum: "$balance" }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: details,
            totals: totals[0] || {
                totalDriverGiven: 0,
                totalStaffGiven: 0,
                totalBalance: 0
            },
            pagination: {
                total,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Error in getReceivedDetailsStaff:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch received details',
            error: error.message
        });
    }
};

// Get summary of staff cash positions
exports.getStaffCashSummary = async (req, res) => {
    try {
        const staffList = await Staff.find()
            .select('name cashInHand')
            .sort({ cashInHand: -1 });

        const totalCashInHand = staffList.reduce(
            (sum, staff) => sum + (staff.cashInHand || 0), 0
        );

        res.status(200).json({
            message: 'Staff cash summary fetched successfully',
            totalCashInHand,
            staffList
        });

    } catch (error) {
        console.error('Error in getStaffCashSummary:', error);
        res.status(500).json({ 
            message: 'Internal Server Error',
            error: error.message 
        });
    }
};