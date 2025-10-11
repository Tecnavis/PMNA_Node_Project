const mongoose = require('mongoose');
const CashCollectionDetailsStaff = require('../Model/cashReceivedDetailsStaff');
const Staff = require('../Model/staff');
const Booking = require('../Model/booking.js')
const ReceivedDetails = require('../Model/ReceivedDetails.js');
const { withRetryableTransaction, networkErrorResponse, isNetworkError } = require('../utils/networkUtils.js');
//...............................................................................................
exports.createReceivedDetailsStaff = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { staffId, givenAmountToStaff, remark, totalStaffAmount } = req.body;
    const userId = req.user.id || req.user._id;

    // Validation
    if (!staffId || !givenAmountToStaff || givenAmountToStaff <= 0) {
      await session.abortTransaction();
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
    let remainingAmount = Number(givenAmountToStaff);
    const selectedBookingIds = [];
    const appliedAmounts = [];

    // ===== DETERMINE DATASET SIZE AND CHOOSE APPROPRIATE STRATEGY =====
    const bookingCount = await Booking.countDocuments({
      status: 'Order Completed',
      workType: 'PaymentWork',
      $or: [
        { 
          cashPending: false,
          receivedUser: 'Staff',
          receivedUserId: staffId, // Specific staff ID
          $expr: {
            $gt: [
              { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
              0
            ]
          }
        },
        { 
          cashPending: false,
          previousReceivedUser: 'Staff',
          previousReceivedUserId: staffId, // Specific staff ID
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
          receivedUser: 'Staff',
          receivedUserId: staffId, // Specific staff ID
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
          previousReceivedUser: 'Staff',
          previousReceivedUserId: staffId, // Specific staff ID
          $expr: {
            $gt: [
              { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
              0
            ]
          }
        }
      ]
    }).session(session);

    console.log(`Found ${bookingCount} eligible bookings for staff ${staffId}`);

    // Strategy selection based on dataset size
    if (bookingCount > 1000) {
      // LARGE DATASET: Use cursor with batch processing
      await processLargeDataset(staffId, remainingAmount, session, selectedBookingIds, appliedAmounts);
    } else {
      // SMALL DATASET: Use regular find with sorting
      await processSmallDataset(staffId, remainingAmount, session, selectedBookingIds, appliedAmounts);
    }

    // Update remaining amount after processing
    const totalApplied = appliedAmounts.reduce((sum, amount) => sum + amount, 0);
    remainingAmount -= totalApplied;

    // ===== ADVANCE DEDUCTION (if remaining) =====
    let advanceDeductionApplied = 0;
    if (remainingAmount > 0) {
      advanceDeductionApplied = await processAdvanceDeduction(
        staffId, remainingAmount, session
      );
      remainingAmount -= advanceDeductionApplied;
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

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: remainingAmount > 0 ? 'Partial distribution completed' : 'Full distribution completed',
      data: cashCollectionDetail,
      distribution: {
        bookings: {
          count: selectedBookingIds.length,
          total: totalApplied,
          amounts: appliedAmounts
        },
        advanceDeductionApplied,
        remainingAmount
      }
    });

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    console.error('Staff payment processing error:', {
      error: error.message,
      stack: error.stack,
      endpoint: 'createReceivedDetailsStaff'
    });

    res.status(500).json({
      success: false,
      code: 'PROCESSING_ERROR',
      message: 'Failed to process staff payment'
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ===== PROCESSING STRATEGIES =====

// For large datasets (>1000 records)
async function processLargeDataset(staffId, remainingAmount, session, selectedBookingIds, appliedAmounts) {
  const batchSize = 500;
  let skip = 0;
  let hasMore = true;

  while (hasMore && remainingAmount > 0) {
    const bookings = await Booking.find({
      status: 'Order Completed',
      workType: 'PaymentWork',
      $or: [
        { 
          cashPending: false,
          receivedUser: 'Staff',
          receivedUserId: staffId,
          $expr: {
            $gt: [
              { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
              0
            ]
          }
        },
        { 
          cashPending: false,
          previousReceivedUser: 'Staff',
          previousReceivedUserId: staffId,
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
          receivedUser: 'Staff',
          receivedUserId: staffId,
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
          previousReceivedUser: 'Staff',
          previousReceivedUserId: staffId,
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
    .skip(skip)
    .limit(batchSize)
    .session(session);

    if (bookings.length === 0) {
      hasMore = false;
      break;
    }

    for (const booking of bookings) {
      if (remainingAmount <= 0) break;

      const allocatableAmount = booking.receivedAmountStaff - (booking.givenAmountByStaff || 0);
      
      if (allocatableAmount > 0) {
        const amountToApply = Math.min(remainingAmount, allocatableAmount);
        
        // Update booking
        booking.givenAmountByStaff = (booking.givenAmountByStaff || 0) + amountToApply;
        
        if (Math.abs((booking.givenAmountByStaff + booking.receivedAmount) - booking.totalAmount) < 0.01) {
          booking.receivedAmount = booking.totalAmount;
        }
        
        remainingAmount -= amountToApply;
        selectedBookingIds.push(booking._id);
        appliedAmounts.push(amountToApply);
        
        await booking.save({ session });
      }
    }

    skip += batchSize;
  }
}

// For small datasets (≤1000 records)
async function processSmallDataset(staffId, remainingAmount, session, selectedBookingIds, appliedAmounts) {
  const bookings = await Booking.find({
    status: 'Order Completed',
    workType: 'PaymentWork',
    $or: [
      { 
        cashPending: false,
        receivedUser: 'Staff',
        receivedUserId: staffId,
        $expr: {
          $gt: [
            { $subtract: ["$receivedAmountStaff", { $ifNull: ["$givenAmountByStaff", 0] }] },
            0
          ]
        }
      },
      { 
        cashPending: false,
        previousReceivedUser: 'Staff',
        previousReceivedUserId: staffId,
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
        receivedUser: 'Staff',
        receivedUserId: staffId,
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
        previousReceivedUser: 'Staff',
        previousReceivedUserId: staffId,
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
  .session(session);

  for (const booking of bookings) {
    if (remainingAmount <= 0) break;

    const allocatableAmount = booking.receivedAmountStaff - (booking.givenAmountByStaff || 0);
    
    if (allocatableAmount > 0) {
      const amountToApply = Math.min(remainingAmount, allocatableAmount);
      
      booking.givenAmountByStaff = (booking.givenAmountByStaff || 0) + amountToApply;
      
      if (Math.abs((booking.givenAmountByStaff + booking.receivedAmount) - booking.totalAmount) < 0.01) {
        booking.receivedAmount = booking.totalAmount;
      }
      
      remainingAmount -= amountToApply;
      selectedBookingIds.push(booking._id);
      appliedAmounts.push(amountToApply);
      
      await booking.save({ session });
    }
  }
}

async function processAdvanceDeduction(staffId, remainingAmount, session) {
  let totalDeducted = 0;
  
  const advanceRecords = await ReceivedDetails.find({
    fileNumber: "Advance Deduction",
    receivedUser: 'Staff',
    receivedUserId: staffId, // Specific staff ID
    $expr: {
      $gt: [
        { $subtract: ["$receivedAmount", { $ifNull: ["$givenAmountByStaff", 0] }] },
        0
      ]
    }
  })
  .sort({ createdAt: 1 })
  .session(session);

  for (const record of advanceRecords) {
    if (remainingAmount <= 0) break;
    
    const allocatableAmount = record.receivedAmount - (record.givenAmountByStaff || 0);
    if (allocatableAmount > 0) {
      const amountToDeduct = Math.min(remainingAmount, allocatableAmount);
      
      record.givenAmountByStaff = (record.givenAmountByStaff || 0) + amountToDeduct;
      totalDeducted += amountToDeduct;
      remainingAmount -= amountToDeduct;
      
      await record.save({ session });
    }
  }

  return totalDeducted;
}
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