const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')
const Provider = require('../Model/provider');
const { default: mongoose } = require('mongoose');
const Staff = require('../Model/staff');
const { 
  isNetworkError,
  withRetryableTransaction,
  networkErrorResponse,
  checkDbConnection
} = require('../utils/networkUtils.js');
// ----------------------------------------------------------------------------------
exports.createReceivedDetails = async (req, res) => {
    // Check DB connection first
  const isDbConnected = await checkDbConnection();
  if (!isDbConnected) {
    return res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection not available',
      retryable: true
    });
  }
  try {
    const result = await withRetryableTransaction(async (session) => {
      // ===== 1. INPUT VALIDATION =====
      const { amount, currentNetAmount, driver, provider, receivedAmount, remark, totalAmount } = req.body;
      const userId = req.user.id || req.user._id;
      const userRole = req.user.role || req.user?.user?.role;
      const receivedUserId = userId;

      if (!amount || !receivedAmount || (!driver && !provider)) {
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
        return res.status(404).json({
          code: 'ENTITY_NOT_FOUND',
          message: isDriver ? 'Driver not found' : 'Provider not found'
        });
      }

      // ===== 3. STAFF VALIDATION =====
      if (userRole === 'Staff') {
        const cashInHand = associateEntity.cashInHand || 0;
        if (Math.abs(Number(receivedAmount) - cashInHand) > 0.01) {
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
  [entityField]: entityId,
   $nor: [
  { // Condition A
    $and: [
      { receivedUser: 'Staff' },
      { previousReceivedUser: { $exists: false } },
      { partialReceivedAmountStaff: false }
    ]
  },
  { // Condition B - The one you care about
    $and: [
      { cashPending: true },
      { receivedUser: { $exists: false } }
    ]
  },
  { // Condition C
    $and: [
      { cashPending: false },
      { receivedUser: 'Staff' }
    ]
  }
],
  $or: [
    // Original conditions...
    { 
      $or: [
        { receivedUser: { $ne: 'Staff' } },
        { receivedUser: { $exists: false } },
        
       
        
        {
          $or: [
            { cashPending: false },
            { cashPending: { $exists: false } },
            { receivedUser: 'Driver' },
            { receivedUser: { $exists: false } }
          ]
        },
                 

                    {
                        $or: [
                            // Non-staff cases
                            // { receivedUser: { $nin: ['Staff', 'Admin'] } },
                            { receivedUser: { $exists: false } },
                            // Staff cases (current or previous)
                            {
                                $or: [
                                    {
                                        $and: [
                                            { receivedUser: 'Staff' },
                                            { partialReceivedAmountStaff: true },
                                              { cashPending: false },
                                        ]
                                    },
                                    {
                                        $and: [
                                            { previousReceivedUser: 'Staff' },
                                            { partialPayment: false }
                                        ]
                                    }
                                ]
                            },
                            // Driver cases with multipleReceivedUser
                            {
                                $and: [
                                    { multipleReceivedUser: true },
                                    {
                                        $or: [
                                            { receivedUser: 'Driver' },
                                            { previousReceivedUser: 'Driver' }

                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ],
      $expr: { $gt: ["$totalAmount", "$receivedAmount"] }
    },
    // ---------------------------==============================
    { 
   status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: true,
                partialPayment: true,
                receivedUser:'Driver',
      $expr: { 
        $and: [
         
          { $gt: ["$receivedAmountDriver", "$receivedAmount"] }
        ]
      }
    },
       { 
   status: 'Order Completed',
               
                multipleReceivedUser : true ,
                receivedUser:'Staff',
                previousReceivedUser: 'Driver',
      $expr: { 
        $and: [
         
          { $gt: ["$receivedAmountDriver", "$receivedAmount"] }
        ]
      }
    },
     { 
    status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: false,
                receivedUser: 'Driver',
                 previousReceivedUser: 'Staff',
      $expr: { 
        $and: [
         
          { $gt: ["$receivedAmountDriver", "$receivedAmount"] }
        ]
      }
    }, 
       { 
      status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: false,
                receivedUser:'Staff',
                previousReceivedUser:"Driver",
                givenAmountByStaff: 0,
      $expr: { 
        $and: [
         
          { $gt: ["$receivedAmountDriver", "$receivedAmount"] }
        ]
      }
    },
  ],
  [entityField]: entityId
};

      const bookings = await Booking.find(bookingQuery)
        .sort({ createdAt: 1 })
        .session(session);
        console.log('=== FOUND BOOKINGS ===');
console.log('Total bookings found:', bookings.length);

// Check if any booking matches our special condition
const specialCaseBookings = bookings.filter(booking => 
  booking.receivedUser === 'Staff' && 
  booking.multipleReceivedUser === true && 
  booking.previousReceivedUser === 'Driver'
);

console.log('Special case bookings found:', specialCaseBookings.length);
specialCaseBookings.forEach(booking => {
  console.log('Special booking details:', {
    id: booking._id,
    receivedUser: booking.receivedUser,
    multipleReceivedUser: booking.multipleReceivedUser,
    previousReceivedUser: booking.previousReceivedUser,
    receivedAmount: booking.receivedAmount,
    receivedAmountDriver: booking.receivedAmountDriver
  });
});
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

      // Return success data
      return {
        success: true,
        distributedAmount: Number(receivedAmount) - remainingAmount,
        remainingAmount,
        audit: {
          transactionId: session.id,
          timestamp: new Date()
        }
      };
     }, { 
      maxRetries: 5, // Increase retries for critical operations
      baseDelay: 2000 // Longer base delay
    });

    // Send success response
    res.status(201).json(result);

  } catch (error) {
    // ===== ERROR HANDLING =====
        if (isNetworkError(error)) {
      // Add additional context for better debugging
      const context = {
        endpoint: 'createReceivedDetails',
        userId: req.user?.id,
        body: req.body,
        timestamp: new Date().toISOString()
      };
      
      return res.status(503).json(networkErrorResponse(error, {
        endpoint: 'createReceivedDetails',
        userId: req.user?.id
      }));
    }

    console.error('Payment processing error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      code: 'PROCESSING_FAILURE',
      message: 'Payment failed to process'
    });
  }
};

function calculateBookingBalance(booking, userRole) {
  // First handle the special condition where:
  
  // Then handle the specific case where:
  // - receivedUser is "Staff"
  // - multipleReceivedUser is true
  // - previousReceivedUser is "Driver"
  if (booking.receivedUser === 'Staff' && 
      booking.multipleReceivedUser === true && 
      booking.previousReceivedUser === 'Driver') {
    return (booking.receivedAmountDriver || 0) - (booking.receivedAmount || 0);
  }

  // Existing logic for Staff with partial received amount
  if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff) {
    return booking.totalAmount - (booking.receivedAmountStaff || 0);
  }
  
  // Default case
  return booking.totalAmount - (booking.receivedAmount || 0);
}

function updateBookingPayment(booking, amount, userRole, receivedUserId) {
  // --------------------------------------------------------------------
  // Special case: When receivedUser is Staff, multipleReceivedUser is true, 
  // and previousReceivedUser is Driver - set receivedAmount to receivedAmountDriver
  if (booking.receivedUser === 'Staff' && 
      booking.multipleReceivedUser === true && 
      booking.previousReceivedUser === 'Driver') {
    
    console.log('Special case: Setting receivedAmount to match receivedAmountDriver');
    console.log('Before - receivedAmount:', booking.receivedAmount, 'receivedAmountDriver:', booking.receivedAmountDriver);
    
    // Set receivedAmount equal to receivedAmountDriver
    booking.receivedAmount = booking.receivedAmountDriver || 0;
    
  // NEW: Check if receivedAmountStaff equals givenAmountByStaff and add to receivedAmount
    if (booking.receivedAmountStaff === booking.givenAmountByStaff) {
      console.log('Adding receivedAmountStaff to receivedAmount since they are equal');
      console.log('Before addition - receivedAmount:', booking.receivedAmount, 'receivedAmountStaff:', booking.receivedAmountStaff);
      
      booking.receivedAmount += (booking.receivedAmountStaff || 0);
      
      console.log('After addition - receivedAmount:', booking.receivedAmount);
    }
    
    return; // Exit early since we're setting specific values
  }

  // Case 1: Staff with partial payment
  if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff) {
    if (userRole === 'Staff') {
      booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + amount;
    } else {
      booking.receivedAmount = (booking.receivedAmount || 0) + amount;
    }
  } 
  // Case 2: Special case where receivedUser is Admin - don't update receivedUser or previousReceivedUser
  else if (booking.receivedUser === 'Admin') {
    // Only update the amount, don't change receivedUser or previousReceivedUser
    booking.receivedAmount = (booking.receivedAmount || 0) + amount;
  }
  // Case 3: Special case where receivedUser is Staff with multipleReceivedUser
  else if (booking.multipleReceivedUser === true && booking.receivedUser === 'Staff' ) {
    // Keep original receivedUser as is
    booking.receivedAmount = (booking.receivedAmount || 0) + amount;
    if (booking.receivedUser === 'Staff') {
    // Track the current payment separately
    booking.previousReceivedUser = userRole;
    booking.previousReceivedUserId = receivedUserId;
    }
  } 
  // Default case (including Staff role updates)
  else {
    booking.receivedAmount = (booking.receivedAmount || 0) + amount;
    
    // Only update receivedUser if not Admin
    if (userRole !== 'Admin') {
      booking.receivedUser = userRole;
      booking.receivedUserId = receivedUserId;
    }
    
    // For Staff role, also update receivedAmountStaff
    if (userRole === 'Staff') {
      booking.receivedAmountStaff = amount;
    }
  }

  // Update partial payment flag
  booking.partialReceivedAmountStaff = 
    Math.abs((booking.receivedAmount || 0) - booking.totalAmount) >= 0.01;
  
  // Update multipleReceivedUser flag if not already set
  if (booking.receivedUser && booking.previousReceivedUser && !booking.multipleReceivedUser) {
    booking.multipleReceivedUser = true;
  }
  // receivedAmountDriver equals receivedAmount AND receivedAmountStaff equals givenAmountByStaff
  if (booking.receivedAmountDriver === booking.receivedAmount && 
    booking.multipleReceivedUser === true &&
      booking.receivedAmountStaff === booking.givenAmountByStaff) {
    booking.receivedAmount = booking.totalAmount;
  }

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