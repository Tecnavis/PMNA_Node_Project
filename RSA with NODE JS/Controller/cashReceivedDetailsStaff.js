const mongoose = require('mongoose');
const CashCollectionDetailsStaff = require('../Model/cashReceivedDetailsStaff');
const Staff = require('../Model/staff');
const Booking = require('../Model/booking.js')


exports.createReceivedDetailsStaff = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { 
            staffId, 
            givenAmountByStaff, 
            remark,
            totalStaffAmount 
        } = req.body;
        
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role;

        // Validate all required fields
        if (!staffId || !givenAmountByStaff || givenAmountByStaff <= 0 || 
            !totalStaffAmount || totalStaffAmount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                success: false,
                message: 'Staff ID, given amount, and total amount are required and must be positive'
            });
        }

        // Check staff exists
        const staff = await Staff.findById(staffId).session(session);
        if (!staff) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        // Calculate balance and current cash in hand
        const currentCashInHand = staff.cashInHand || 0;
        const newBalance = currentCashInHand - Number(givenAmountByStaff);

        let remainingAmount = Number(givenAmountByStaff);
        const selectedBookingIds = [];

        // Fetch bookings where staff needs to receive payment
        const bookings = await Booking.find({
            status: 'Order Completed',
            receivedUser: 'Staff',
            receivedUserId: staffId,
            $or: [
                { partialReceivedAmountStaff: true },
                { $expr: { $gt: ["$totalAmount", "$receivedAmountStaff"] } }
            ]
        }).sort({ createdAt: 1 }).session(session);

        // Update bookings by distributing givenAmountByStaff
        for (const booking of bookings) {
            if (remainingAmount <= 0) break;

            // Calculate outstanding amount
            const outstanding = booking.totalAmount - (booking.receivedAmountStaff || 0);
            const amountToApply = Math.min(remainingAmount, outstanding);
            
            // Update booking amounts
            booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + amountToApply;
            booking.partialReceivedAmountStaff = booking.receivedAmountStaff < booking.totalAmount;
            
            // If fully paid, update status
            if (!booking.partialReceivedAmountStaff) {
                booking.receivedAmount = booking.totalAmount;
                booking.cashPending = false;
            }

            remainingAmount -= amountToApply;
            selectedBookingIds.push(booking._id);
            await booking.save({ session });
        }

        // Create cash collection record
        const cashCollectionDetail = await CashCollectionDetailsStaff.create([{
            balance: newBalance.toString(),
            currentCashInHand,
            totalStaffAmount: Number(totalStaffAmount),
            receivedUserId: userId,
            staff: staffId,
            givenAmountByStaff: Number(givenAmountByStaff),
            remark: remark || 'No remarks provided',
            processedBookings: selectedBookingIds,
            remainingAmount
        }], { session });

        // Update staff's cash in hand
        staff.cashInHand = newBalance;
        await staff.save({ session });

        await session.commitTransaction();
        
        res.status(201).json({
            success: true,
            message: 'Staff cash collection recorded successfully',
            data: cashCollectionDetail[0],
            staff: {
                id: staff._id,
                name: staff.name,
                newBalance: staff.cashInHand
            },
            processedBookings: {
                count: selectedBookingIds.length,
                remainingAmount
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in createReceivedDetailsStaff:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to record staff cash collection',
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

exports.getReceivedDetailsStaff = async (req, res) => {
    try {
        const { staffId, search } = req.query;
        
        const query = {};
        if (staffId) query.staff = staffId;
        if (search) {
            query.$or = [
                { remark: { $regex: search, $options: 'i' } },
                { 'staff.name': { $regex: search, $options: 'i' } }
            ];
        }

        const details = await CashCollectionDetailsStaff.find(query)
            .populate('staff', 'name')
            .populate('receivedUserId', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: details
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