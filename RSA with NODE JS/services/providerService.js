const Provider = require('../Model/provider');
const Booking = require('../Model/booking');
const { distributeReceivedAmount } = require('./bookingService');
const { default: mongoose } = require('mongoose');
async function getValidDateRange(providerId) {
    const provider = await Provider.findById(providerId)
        .select('previousSettlementCompletedDate settlementCompletedDate')
        .lean();

    if (!provider) {
        throw new Error('provider not found');
    }

    const now = new Date();
    
    // If dates are invalid or missing, use current month
    if (!provider.previousSettlementCompletedDate || !provider.settlementCompletedDate || 
        provider.previousSettlementCompletedDate > provider.settlementCompletedDate) {
        return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        };
    }
    
    return {
        startDate: provider.previousSettlementCompletedDate,
        endDate: provider.settlementCompletedDate
    };
}
// Calculating the net total amount in hand 
async function calculateNetTotalAmountInHand(providerId) {

  const result = await Booking.aggregate([
          {
              $match: {
                  provider: new mongoose.Types.ObjectId(providerId),
                  status: 'Order Completed',
                  workType: 'PaymentWork',
                  // STRICTLY exclude cashPending=true cases
                  $and: [
                      {
                          $or: [
                              { cashPending: false },
                              { cashPending: { $exists: false } }
                          ]
                      },
                      {
                          $or: [
                              // Non-staff cases
                              { receivedUser: { $ne: 'Staff' } },
                              { receivedUser: { $exists: false } },
                              // Staff cases (current or previous)
                              {
                                  $or: [
                                      {
                                          $and: [
                                              { receivedUser: 'Staff' },
                                              { partialReceivedAmountStaff: true }
                                          ]
                                      },
                                   
                                  ]
                              }
                          ]
                      }
                  ]
              }
          },
           {
              $addFields: {
                  effectiveReceivedAmount: {
                      $cond: [
                          {
                              $or: [
                                  {
                                      $and: [
                                          { $eq: ["$receivedUser", "Staff"] },
                                          { $eq: ["$partialReceivedAmountStaff", true] }
                                      ]
                                  },
                             
                              ]
                          },
                          "$receivedAmountStaff",  // Use receivedAmountStaff for partial Staff payments
                          "$receivedAmount"       // Use regular receivedAmount for all others
                      ]
                  }
              }
          },
          {
              $group: {
                  _id: null,
                  netTotalAmount: {
                      $sum: {
                          $subtract: ["$totalAmount", "$effectiveReceivedAmount"]
                      }
                  }
              }
          }
      ]);
  
      const result2 = await Booking.aggregate([
          {
              $match: {
                  provider: new mongoose.Types.ObjectId(providerId),
                  partialPayment: true,
                  workType: 'PaymentWork'
              }
          },
          {
              $group: {
                  _id: null,
                  netTotalAmount2: {
                      $sum: '$partialAmount'
                  }
              }
          }
      ]);
  
      return (
          (result[0]?.netTotalAmount || 0) +
          (result2[0]?.netTotalAmount2 || 0)
      );
  }
// Calculate the provider total salary from verified bookings
async function calculateTotalSalary(providerId) {
    const result = await Booking.aggregate([
        {
            $match: {
                provider: providerId,
                verified: true,
            }
        },
        {
            $group: {
                _id: null,
                providerTotalSalary: {
                    $sum: '$driverSalary'
                },
                 providerTotalTransferdSalary: {
                    $sum: '$transferedSalary'
                }
            }
     },
        {
            $project: {
                _id: 0,
                actualSalary: {
                    $subtract: ['$providerTotalSalary', '$providerTotalTransferdSalary']
                  }
            }
        }
    ]);
    return result[0]?.actualSalary || 0;
}
// Update financial values in driver side
async function updateProviderFinancials(providerId, advance = 0) {
    const netTotalAmount = await calculateNetTotalAmountInHand(providerId);
    const totalSalary = await calculateTotalSalary(providerId);

    const balance = calculateBalanceAmount(netTotalAmount, totalSalary) || 0
    const monthlySalary = await calculateMonthlySalary(providerId);

    const finalCashInHand = netTotalAmount + advance
    const updatedDriver = await Provider.findByIdAndUpdate(
        providerId,
        {
            cashInHand: finalCashInHand,
            driverSalary: totalSalary,
            balanceAmount: balance,
                    totalSalary: monthlySalary,

        },
        { new: true }
    );

    return updatedDriver;
}

// Function for update driver balance amount (balance amount to give to admin)
function calculateBalanceAmount(cashInHand, driverSalary) {
    if (cashInHand <= 0 || cashInHand < driverSalary) {
        return 0
    }
    return cashInHand - driverSalary
}
async function calculateMonthlySalary(providerId) {

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const result = await Booking.aggregate([
        {
            $match: {
                provider: new mongoose.Types.ObjectId(providerId),
                verified: true,
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                totalMonthlySalary: { $sum: '$driverSalary' }
            }
        },
    ]);
    return result[0]?.totalMonthlySalary || 0;

}
module.exports = {
        calculateNetTotalAmountInHand,
    
    updateProviderFinancials,
};
