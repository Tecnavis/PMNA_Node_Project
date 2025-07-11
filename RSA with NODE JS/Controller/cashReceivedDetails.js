const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')
const Provider = require('../Model/provider');
const { default: mongoose } = require('mongoose');
const Staff = require('../Model/staff');
// ----------------------------
exports.createReceivedDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ===== 1. INPUT VALIDATION =====
    const { amount, currentNetAmount, driver, provider, receivedAmount, remark, totalAmount } = req.body;
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role || req.user?.user?.role;
    const receivedUserId = userId;

    if (!amount || !receivedAmount || (!driver && !provider)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        code: 'MISSING_FIELDS',
        message: 'Amount, receivedAmount, and driver/provider are required' 
      });
    }

    // ===== 2. ENTITY VERIFICATION =====
    const isDriver = !!driver;
    const entityId = isDriver ? driver : provider;
    const entityModel = isDriver ? Driver : Provider;
    const entityField = isDriver ? 'driver' : 'provider';

    const associateEntity = await entityModel.findById(entityId).session(session);
    if (!associateEntity) {
      await session.abortTransaction();
      return res.status(404).json({
        code: 'ENTITY_NOT_FOUND',
        message: isDriver ? 'Driver not found' : 'Provider not found'
      });
    }

    // ===== 3. STAFF VALIDATION =====
    if (userRole === 'Staff') {
      const cashInHand = associateEntity.cashInHand || 0;
      if (Math.abs(Number(receivedAmount) - cashInHand) > 0.01) {
        await session.abortTransaction();
        return res.status(403).json({
          code: 'STAFF_AMOUNT_MISMATCH',
          message: `Staff can only receive exact cash in hand (${cashInHand})`
        });
      }
    }

    // ===== 4. BOOKING PROCESSING =====
    let remainingAmount = Number(receivedAmount);
    const processedBookings = [];

    const bookingQuery = {
      status: 'Order Completed',
      workType: 'PaymentWork',
      cashPending: false,
      $or: [
        { receivedUser: { $ne: 'Staff' } },
        { receivedUser: 'Staff', partialReceivedAmountStaff: true }
      ],
      $expr: { $gt: ["$totalAmount", "$receivedAmount"] },
      [entityField]: entityId
    };

    const bookings = await Booking.find(bookingQuery)
      .sort({ createdAt: 1 })
      .session(session);

    // Process each booking in transaction
    for (const booking of bookings) {
      if (remainingAmount <= 0) break;

      const bookingBalance = calculateBookingBalance(booking, userRole);
      if (bookingBalance <= 0) continue;

      const appliedAmount = Math.min(remainingAmount, bookingBalance);
      updateBookingPayment(booking, appliedAmount, userRole, receivedUserId);
      
      remainingAmount -= appliedAmount;
      processedBookings.push(booking._id);
      await booking.save({ session });
    }

    // ===== 5. ADVANCE DEDUCTION =====
    if (remainingAmount > 0) {
      await processAdvanceDeduction(
        associateEntity, 
        isDriver, 
        remainingAmount, 
        { remark, totalAmount, userRole, receivedUserId },
        session
      );
    }

    // ===== 6. CREATE RECEIVED RECORDS =====
    await createReceivedRecords(
      processedBookings, 
      associateEntity, 
      { isDriver, remark, totalAmount, userRole, receivedUserId },
      session
    );

    // ===== 7. FINALIZE TRANSACTION =====
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      distributedAmount: Number(receivedAmount) - remainingAmount,
      remainingAmount,
      audit: {
        transactionId: session.id,
        timestamp: new Date()
      }
    });

  } catch (error) {
    // ===== ERROR HANDLING =====
    await session.abortTransaction();
    
    if (isNetworkError(error)) {
      console.error('Network failure during payment:', {
        error: error.message,
        sessionId: session.id,
        userId: req.user?.id
      });
      
      return res.status(503).json({
        code: 'NETWORK_FAILURE',
        message: 'Payment processing interrupted. Please retry.',
        retryable: true
      });
    }

    console.error('Payment processing error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      code: 'PROCESSING_FAILURE',
      message: 'Payment failed to process',
      referenceId: session.id
    });
  } finally {
    session.endSession();
  }
};

// Helper Functions
function calculateBookingBalance(booking, userRole) {
  if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff) {
    return booking.totalAmount - (booking.receivedAmountStaff || 0);
  }
  return booking.totalAmount - (booking.receivedAmount || 0);
}

function updateBookingPayment(booking, amount, userRole, receivedUserId) {
  if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff) {
    if (userRole === 'Staff') {
      booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + amount;
    } else {
      booking.receivedAmount = (booking.receivedAmount || 0) + amount;
    }
  } else {
    booking.receivedAmount = (booking.receivedAmount || 0) + amount;
    if (userRole === 'Staff') {
      booking.receivedAmountStaff = amount;
    }
  }

  // Update tracking fields
  booking.receivedUser = userRole;
  booking.receivedUserId = receivedUserId;
  booking.partialReceivedAmountStaff = 
    Math.abs((booking.receivedAmount || 0) - booking.totalAmount) >= 0.01;
}

async function processAdvanceDeduction(entity, isDriver, amount, meta, session) {
  const newAdvance = Math.max(0, (entity.advance || 0) - amount);
  entity.advance = newAdvance;
  await entity.save({ session });

  const lastAdvance = await Advance.findOne({
    [isDriver ? 'driver' : 'provider']: entity._id
  })
  .sort({ createdAt: -1 })
  .session(session);

  if (lastAdvance) {
    lastAdvance.advance = newAdvance;
    await lastAdvance.save({ session });
  }

  await ReceivedDetails.create([{
    remark: meta.remark,
    balance: newAdvance,
    fileNumber: 'Advance Deduction',
    currentNetAmount: 0,
    amount: `Advance: ${newAdvance}`,
    [isDriver ? 'driver' : 'provider']: entity._id,
    receivedAmount: amount,
    totalAmount: meta.totalAmount,
    receivedUser: meta.userRole,
    receivedUserId: meta.receivedUserId,
    transactionType: 'ADVANCE_DEDUCTION'
  }], { session });
}

async function createReceivedRecords(bookingIds, entity, meta, session) {
  for (const bookingId of bookingIds) {
    const booking = await Booking.findById(bookingId).session(session);
    const amountToRecord = booking.receivedAmount || 0;
    const balance = (booking.totalAmount - amountToRecord).toFixed(2);

    await ReceivedDetails.create([{
      remark: meta.remark,
      balance,
      fileNumber: booking.fileNumber,
      currentNetAmount: balance,
      amount: booking.totalAmount,
      [meta.isDriver ? 'driver' : 'provider']: entity._id,
      receivedAmount: amountToRecord,
      totalAmount: meta.totalAmount,
      receivedUser: meta.userRole,
      receivedUserId: meta.receivedUserId,
      transactionType: 'BOOKING_PAYMENT'
    }], { session });
  }
}

function isNetworkError(error) {
  return error.message.includes('network') || 
         error.message.includes('ECONN') || 
         error.message.includes('timeout') ||
         error.name === 'MongoNetworkError';
}

exports.getAllReceivedDetails = async (req, res) => {
    try {
        const { search, driverId, providerId, month, year } = req.query;

        const query = {};

        // Handle either driver or provider
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        } else if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // Date filtering
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
                { fileNumber: regex },
            ];

            const [matchingDrivers, matchingProviders] = await Promise.all([
                Driver.find({ name: regex }).select('_id').lean(),
                Provider.find({ name: regex }).select('_id').lean(),
            ]);

            if (matchingDrivers.length > 0) {
                searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
            }
            if (matchingProviders.length > 0) {
                searchConditions.push({ provider: { $in: matchingProviders.map(p => p._id) } });
            }

            query.$or = searchConditions;
        }

        const receivedDetails = await ReceivedDetails
            .find(query)
            .sort({ createdAt: -1 })
            .populate('driver provider');

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getStaffReceivedDetails = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { month, year, search } = req.query;

        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: 'Invalid staff ID' });
        }
        const staffObjectId = new mongoose.Types.ObjectId(staffId);

        const baseQuery = {
            $or: [
                {
                    $and: [
                        { receivedUserId: staffObjectId },
                        { receivedUser: 'Staff' }
                    ]
                },
                {
                    $and: [
                        { previousReceivedUserId: staffObjectId },
                        { previousReceivedUser: 'Staff' }
                    ]
                }
            ]
        };

        const dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            dateFilter.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            dateFilter.createdAt = { $gte: startDate, $lte: endDate };
        }

        const searchFilter = {};
        if (search && search.trim()) {
            const searchQuery = search.trim();
            const regex = new RegExp(searchQuery, 'i');

            searchFilter.$or = [
                { fileNumber: regex },
                { remark: regex },
                { amount: regex }
            ];
        }

        const query = {
            $and: [
                baseQuery,
                dateFilter,
                ...(search && search.trim() ? [searchFilter] : [])
            ]
        };

        const receivedDetails = await ReceivedDetails.find(query)
            .sort({ createdAt: -1 })
            .populate('driver provider')
            .populate({
                path: 'receivedUserId',
                select: 'name'
            });

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error('Error fetching staff received details:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};