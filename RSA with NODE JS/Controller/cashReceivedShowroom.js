// controllers/showroomPaymentController.js
const mongoose = require('mongoose');
const ShowroomPayment = require('../Model/ShowroomPayment');
const Showroom = require('../Model/showroom');
const Booking = require('../Model/booking');
const { withRetryableTransaction, networkErrorResponse, isNetworkError } = require('../utils/networkUtils');

// Create showroom payment
exports.createShowroomPayment = async (req, res) => {
  try {
    // Wrap the entire operation in a retryable transaction
    const result = await withRetryableTransaction(async (session) => {
      const { 
        showroomId, 
        collectedAmount, 
        previousBalance, 
        newBalance, 
        paymentMode, 
        referenceNumber, 
        remark 
      } = req.body;

      const userId = req.user?.id; // Assuming you have user authentication

      // Validation
      if (!showroomId || !collectedAmount || collectedAmount <= 0) {
        return res.status(400).json({ 
          success: false,
          code: 'INVALID_INPUT',
          message: 'Showroom ID and collected amount are required and must be positive'
        });
      }

      // Check showroom exists
      const showroom = await Showroom.findById(showroomId).session(session);
      if (!showroom) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          code: 'SHOWROOM_NOT_FOUND',
          message: 'Showroom not found'
        });
      }

      // Validate balance
      const currentCashInHand = showroom.cashInHand || 0;
      if (collectedAmount > currentCashInHand) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          message: `Showroom only has ₹${currentCashInHand} available`,
          currentBalance: currentCashInHand
        });
      }

      // ===== BOOKING DISTRIBUTION =====
      let remainingAmount = Number(collectedAmount);
      const selectedBookingIds = [];
      const appliedAmounts = [];

      // Find bookings associated with this showroom that need payment processing
      const bookings = await Booking.find({
        status: 'Order Completed',
        workType: 'PaymentWork',
        cashPending: false,
        showroom: showroomId
      })
      .sort({ createdAt: 1 })
      .session(session);

      for (const booking of bookings) {
        if (remainingAmount <= 0) break;

        let allocatableAmount;
        
        // Calculate how much can be allocated to this booking
        allocatableAmount = booking.showroomAmount - (booking.receivedAmountShowroom || 0);
        
        if (allocatableAmount > 0) {
          const amountToApply = Math.min(remainingAmount, allocatableAmount);
          
          // Update booking with new given amount
          booking.receivedAmountShowroom = (booking.receivedAmountShowroom || 0) + amountToApply;
          
          // Check if payment is complete for this booking
          if (Math.abs((booking.receivedAmountShowroom + booking.receivedAmount) - booking.totalAmount) < 0.01) {
            booking.receivedAmount = booking.totalAmount;
          }
          
          remainingAmount -= amountToApply;
          selectedBookingIds.push(booking._id);
          appliedAmounts.push(amountToApply);
          await booking.save({ session });
        }
      }

      // ===== CREATE PAYMENT RECORD =====
      const paymentData = {
        showroomId,
        showroomName: showroom.name,
        collectedAmount: Number(collectedAmount),
        previousBalance: Number(previousBalance),
        newBalance: Number(newBalance),
        paymentMode,
        referenceNumber,
        remark: remark || 'No remarks provided',
      
        processedBookings: selectedBookingIds,
        appliedAmounts,
        remainingAmount,
        transactionStatus: remainingAmount > 0 ? 'PARTIAL' : 'COMPLETE'
      };

      const [paymentRecord] = await ShowroomPayment.create([paymentData], { session });

      // Update showroom's cash in hand
      showroom.cashInHand = newBalance;
      await showroom.save({ session });

      return {
        status: 201,
        response: {
          success: true,
          message: remainingAmount > 0 ? 'Partial distribution completed' : 'Full distribution completed',
          data: paymentRecord,
          distribution: {
            bookings: {
              count: selectedBookingIds.length,
              total: appliedAmounts.reduce((a, b) => a + b, 0),
              amounts: appliedAmounts
            },
            remainingAmount
          },
          audit: {
            transactionId: session.id,
            timestamp: new Date()
          }
        }
      };
    });

    // Send the successful response
    res.status(result.status).json(result.response);

  } catch (error) {
    console.error('Showroom payment processing error:', {
      error: error.message,
      stack: error.stack,
      endpoint: 'createShowroomPayment'
    });

    if (isNetworkError(error)) {
      // Network error response
      const errorResponse = networkErrorResponse(error, {
        endpoint: 'createShowroomPayment',
        userId: req.user?.id
      });
      return res.status(503).json(errorResponse);
    }

    // Other errors
    res.status(500).json({
      success: false,
      code: 'PROCESSING_ERROR',
      message: 'Failed to process showroom payment',
      referenceId: error.session?.id
    });
  }
};

exports.getShowroomPayments = async (req, res) => {
  try {
    console.log('Query parameters:', req.query);
    console.log('Building query with:', { showroomId: req.query.showroomId });
    
    const { showroomId, search, page = 1, pageSize = 10 } = req.query;
    
    const query = {};
    if (showroomId) {
      console.log('Filtering by showroomId:', showroomId);
      query.showroomId = showroomId;
    }
    
    if (search) {
      query.$or = [
        { remark: { $regex: search, $options: 'i' } },
        { showroomName: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get paginated results
    const skip = (page - 1) * pageSize;
    const total = await ShowroomPayment.countDocuments(query);
    const payments = await ShowroomPayment.find(query)
     
      .populate('processedBookings', 'fileNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    // Calculate totals
    const totals = await ShowroomPayment.aggregate([
      { $match: query },
      { 
        $group: {
          _id: null,
          totalCollected: { $sum: "$collectedAmount" },
          totalProcessed: { $sum: { $sum: "$appliedAmounts" } },
          totalRemaining: { $sum: "$remainingAmount" }
        }
      }
    ]);
    console.log('Found payments:', payments.length);
    console.log('First payment:', payments[0]);
    res.status(200).json({
      success: true,
      data: payments,
      totals: totals[0] || {
        totalCollected: 0,
        totalProcessed: 0,
        totalRemaining: 0
      },
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    });

   } catch (error) {
    console.error('Error in getShowroomPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch showroom payments',
      error: error.message
    });
  }
};

