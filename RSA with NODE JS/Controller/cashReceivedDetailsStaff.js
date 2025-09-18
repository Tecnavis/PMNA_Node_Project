const mongoose = require('mongoose');
const CashCollectionDetailsStaff = require('../Model/cashReceivedDetailsStaff');
const Staff = require('../Model/staff');
const Booking = require('../Model/booking.js')
const ReceivedDetails = require('../Model/ReceivedDetails.js');
const { withRetryableTransaction, networkErrorResponse, isNetworkError } = require('../utils/networkUtils.js');
//...............................................................................................
exports.createReceivedDetailsStaff = async (req, res) => {
  try {
    const result = await withRetryableTransaction(async (session) => {
      const { staffId, givenAmountToStaff, remark, totalStaffAmount } = req.body;
      const userId = req.user.id || req.user._id;
      const userRole = req.user.role;

      // Validation
      if (!staffId || !givenAmountToStaff || givenAmountToStaff <= 0) {
        return res.status(400).json({ 
          success: false,
          code: 'INVALID_INPUT',
          message: 'Staff ID, given amount, and total amount are required and must be positive'
        });
      }

      // Check staff exists
      const staff = await Staff.findById(staffId).session(session);
      if (!staff) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          code: 'STAFF_NOT_FOUND',
          message: 'Staff member not found'
        });
      }

      // Calculate new balance
      const currentCashInHand = staff.cashInHand || 0;
      if (givenAmountToStaff > currentCashInHand) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          message: `Staff only has ₹${currentCashInHand} available`
        });
      }
      const newBalance = currentCashInHand - Number(givenAmountToStaff);

      // ===== BOOKING DISTRIBUTION USING CURSOR =====
      let remainingAmount = Number(givenAmountToStaff);
      const selectedBookingIds = [];
      const appliedAmounts = [];

      // Create cursor for large dataset
      const bookingCursor = Booking.find({
        status: 'Order Completed',
        workType: 'PaymentWork',
        $or: [
          { 
            cashPending: false,
            $or: [
              { receivedUser: 'Staff', receivedUserId: staffId },
              { previousReceivedUser: 'Staff', previousReceivedUserId: staffId }
            ],
            $expr: {
              $gt: [
                { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
                0
              ]
            }
          },
          { 
            cashPending: true,
            partialPayment: true,
            $or: [
              { receivedUser: 'Staff', receivedUserId: staffId },
              { previousReceivedUser: 'Staff', previousReceivedUserId: staffId }
            ],
            $expr: {
              $gt: [
                { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
                0
              ]
            }
          }
        ]
      })
      .sort({ createdAt: 1 })
      .batchSize(100) // Process in batches of 100
      .cursor({ session })
      .addCursorFlag('noCursorTimeout', true); // Prevent cursor timeout

      console.log(`Starting distribution for amount: ₹${remainingAmount}`);

      // Process bookings using cursor
      for await (const booking of bookingCursor) {
        if (remainingAmount <= 0) {
          break; // Stop if no remaining amount
        }

        const allocatableAmount = booking.receivedAmountStaff - (booking.givenAmountByStaff || 0);
        
        if (allocatableAmount > 0) {
          const amountToApply = Math.min(remainingAmount, allocatableAmount);
          
          // Update booking with new given amount
          booking.givenAmountByStaff = (booking.givenAmountByStaff || 0) + amountToApply;
          
          // Check if full amount is received
          if (Math.abs((booking.givenAmountByStaff + booking.receivedAmount) - booking.totalAmount) < 0.01) {
            booking.receivedAmount = booking.totalAmount;
          }
          
          remainingAmount -= amountToApply;
          selectedBookingIds.push(booking._id);
          appliedAmounts.push(amountToApply);
          
          await booking.save({ session });
          
          console.log(`Applied ₹${amountToApply} to booking ${booking._id}, Remaining: ₹${remainingAmount}`);
        }
      }

      // Close the cursor explicitly
      await bookingCursor.close();
      
      console.log(`Final remaining amount: ₹${remainingAmount}`);
      console.log(`Processed ${selectedBookingIds.length} bookings`);

      // ===== ADVANCE DEDUCTION (if remaining) =====
      let advanceDeductionApplied = 0;
      if (remainingAmount > 0) {
        // Use cursor for advance records as well
        const advanceCursor = ReceivedDetails.find({
          fileNumber: "Advance Deduction",
          $or: [
            { receivedUser: 'Staff', receivedUserId: staffId },
          ],
          $expr: {
            $gt: [
              { $subtract: ["$receivedAmount", { $ifNull: ["$givenAmountByStaff", 0] }] },
              0
            ]
          }
        })
        .sort({ createdAt: 1 })
        .batchSize(100)
        .cursor({ session })
        .addCursorFlag('noCursorTimeout', true);

        for await (const record of advanceCursor) {
          if (remainingAmount <= 0) break;
          
          const allocatableAmount = record.receivedAmount - (record.givenAmountByStaff || 0);
          if (allocatableAmount > 0) {
            const amountToDeduct = Math.min(remainingAmount, allocatableAmount);
            
            record.givenAmountByStaff = amountToDeduct;
            advanceDeductionApplied += amountToDeduct;
            remainingAmount -= amountToDeduct;
            
            await record.save({ session });
          }
        }
        
        await advanceCursor.close();
      }

      // ===== CREATE CASH COLLECTION RECORD =====
      const cashCollectionData = {
        balance: newBalance.toString(),
        currentCashInHand,
        totalStaffAmount: Number(totalStaffAmount),
        receivedUserId: userId,
        staff: staffId,
        givenAmountToStaff: Number(givenAmountToStaff),
        remark: remark || 'No remarks provided',
        processedBookings: selectedBookingIds,
        appliedAmounts,
        advanceDeductionApplied,
        remainingAmount,
        transactionStatus: remainingAmount > 0 ? 'PARTIAL' : 'COMPLETE'
      };

      const [cashCollectionDetail] = await CashCollectionDetailsStaff.create([cashCollectionData], { session });

      // Update staff's cash in hand
      staff.cashInHand = newBalance;
      await staff.save({ session });

      return {
        status: 201,
        response: {
          success: true,
          message: remainingAmount > 0 ? 'Partial distribution completed' : 'Full distribution completed',
          data: cashCollectionDetail,
          distribution: {
            bookings: {
              count: selectedBookingIds.length,
              total: appliedAmounts.reduce((a, b) => a + b, 0),
              amounts: appliedAmounts
            },
            advanceDeductionApplied,
            remainingAmount
          },
          audit: {
            transactionId: session.id,
            timestamp: new Date()
          }
        }
      };
    });

    res.status(result.status).json(result.response);

  } catch (error) {
    console.error('Staff payment processing error:', {
      error: error.message,
      stack: error.stack,
      endpoint: 'createReceivedDetailsStaff'
    });

    if (isNetworkError(error)) {
      const errorResponse = networkErrorResponse(error, {
        endpoint: 'createReceivedDetailsStaff',
        userId: req.user?.id
      });
      return res.status(503).json(errorResponse);
    }

    res.status(500).json({
      success: false,
      code: 'PROCESSING_ERROR',
      message: 'Failed to process staff payment',
      referenceId: error.session?.id
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