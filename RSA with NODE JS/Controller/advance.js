const { default: mongoose } = require('mongoose');
const Advance = require('../Model/advance');
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');

const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');
// -----------------------------------------
//Controller for creating new advance
exports.createNewAdvance = async (req, res) => {
    const { remark, advance, driverId, type } = req.body;
    try {
        if (!remark || !advance || !driverId || !type) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        let source;
        let userType = "Driver";
        source = await Driver.findById(driverId);

        if (!source) {
            source = await Provider.findById(driverId);
            userType = 'Provider';
        }

        if (!source) {
            userType = '';
            return res.status(404).json({ message: 'Driver or Provider not found' });
        }

        // Get the most recent advance to get the previous cashInHand value
        const previousAdvanceRecord = await Advance.findOne({ driver: driverId })
            .sort({ createdAt: -1 }) // Get the most recent record
            .exec();

        const previousAdvanceAmount = previousAdvanceRecord ? previousAdvanceRecord.advance : 0;
        const previousCashInHand = previousAdvanceRecord ? previousAdvanceRecord.cashInHand : 0;

        // Calculate current total advance without modifying historical records
        const previousAdvances = await Advance.find({ driver: driverId });
        
        let existingAdvance = 0;
        for (const adv of previousAdvances) {
            existingAdvance += adv.advance;
            adv.advance = 0;
            await adv.save();
        }
        const newAdvance = existingAdvance + Number(advance);

        // Update driver's total advance
        source.advance = newAdvance;
        await source.save();

        // Create new advance document with the added amount and new total
        const newAdvanceDoc = await Advance.create({
            driver: driverId,
            addedAdvance: Number(advance),  // The amount being added in this transaction
            advance: newAdvance,       // The new cumulative total
            previousAdvance: previousAdvanceAmount, // Store previous advance amount
            cashInHand: previousCashInHand, // Store previous cashInHand value
            type,
            userModel: userType,
            remark,
        });

        const advanceMoreData = await settleBookingsWithAdvance(driverId, newAdvanceDoc, userType);
        
        // Update advance doc with settlement data
        newAdvanceDoc.filesNumbers = advanceMoreData.filesNumbers;
        newAdvanceDoc.driverSalary = advanceMoreData.driverSalary;
        newAdvanceDoc.balanceSalary = advanceMoreData.balanceSalary;
        newAdvanceDoc.transferdSalary = advanceMoreData.transferdSalary;
        await newAdvanceDoc.save();

        res.status(200).json({ 
            message: 'Advance saved and settlement done.', 
            driver: source,
            previousAdvance: existingAdvance,
            addedAdvance: Number(advance),
            newAdvanceTotal: newAdvance
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}
// Update existing advance record
exports.updateAdvance = async (req, res) => {
    const { id } = req.params;
    const { remark, advance, type } = req.body;
    
    try {
        if (!remark || !advance || !type) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Find the advance record to update
        const advanceRecord = await Advance.findById(id);
        if (!advanceRecord) {
            return res.status(404).json({ message: 'Advance record not found' });
        }

        // Find all advance records for this driver
        const allAdvances = await Advance.find({ driver: advanceRecord.driver }).sort({ createdAt: 1 });
        
        // Recalculate all advances to maintain accurate totals
        let recalculatedAdvances = [];
        let runningTotal = 0;
        
        for (const record of allAdvances) {
            if (record._id.toString() === id) {
                // This is the record we're updating
                runningTotal += Number(advance);
                recalculatedAdvances.push({
                    ...record.toObject(),
                    addedAdvance: Number(advance),
                    advance: runningTotal,
                    remark,
                    type,
                    updatedAt: new Date()
                });
            } else {
                // Other records - just update their running total
                runningTotal += record.addedAdvance;
                recalculatedAdvances.push({
                    ...record.toObject(),
                    advance: runningTotal
                });
            }
        }

        // Update all records in the database
        for (const update of recalculatedAdvances) {
            await Advance.findByIdAndUpdate(update._id, {
                addedAdvance: update.addedAdvance,
                advance: update.advance,
                remark: update._id.toString() === id ? update.remark : undefined,
                type: update._id.toString() === id ? update.type : undefined,
                updatedAt: update.updatedAt
            });
        }

        // Update the driver/provider's total advance
        const driverId = advanceRecord.driver;
        const userType = advanceRecord.userModel;
        
        let source;
        if (userType === 'Driver') {
            source = await Driver.findById(driverId);
        } else {
            source = await Provider.findById(driverId);
        }

        if (source) {
            source.advance = runningTotal;
            await source.save();
        }

        // Get the updated record to return
        const updatedRecord = await Advance.findById(id);

        res.status(200).json({
            message: 'Advance updated successfully',
            advance: updatedRecord,
            newTotalAdvance: runningTotal
        });

    } catch (error) {
        console.error('Error updating advance:', error);
        res.status(500).json({ 
            message: 'Server error while updating advance',
            error: error.message 
        });
    }
};

// Get single advance record
exports.getAdvanceById = async (req, res) => {
    try {
        const advance = await Advance.findById(req.params.id);
        if (!advance) {
            return res.status(404).json({ message: 'Advance not found' });
        }
        res.status(200).json(advance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
// helper controller for update advance amount to all driver booking salary
const settleBookingsWithAdvance = async (driverId, advanceDoc, userType) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    const driverObjectId = new mongoose.Types.ObjectId(driverId);
    const data = {
      filesNumbers: [],
      driverSalary: [],
      balanceSalary: [],
      transferdSalary: [],
    };

    const bookings = await Booking.find({
      [userType === 'Driver' ? 'driver' : 'provider']: driverObjectId,
      verified: true,
    }).session(session);

    if (!bookings.length) return data;

    let remainingAdvance = advanceDoc.advance;

    for (const booking of bookings) {
      const currentTransferred = booking.transferedSalary || 0;
      const balanceSalary = booking.driverSalary - currentTransferred;

      if (balanceSalary <= 0) continue;

      const transferAmount = Math.min(balanceSalary, remainingAdvance);

      // Update booking
      booking.transferedSalary = currentTransferred + transferAmount;
      await booking.save({ session });

      // Update tracking data
      data.filesNumbers.push(booking.fileNumber);
      data.driverSalary.push(booking.driverSalary);
      data.balanceSalary.push(balanceSalary);
      data.transferdSalary.push(transferAmount);

      remainingAdvance -= transferAmount;
      if (remainingAdvance <= 0) break;
    }

    // Update advance document
    advanceDoc.advance = remainingAdvance;
    advanceDoc.cashInHand = (advanceDoc.cashInHand || 0) + remainingAdvance;
    advanceDoc.filesNumbers = data.filesNumbers;
    advanceDoc.driverSalary = data.driverSalary;
    advanceDoc.balanceSalary = data.balanceSalary;
    advanceDoc.transferdSalary = data.transferdSalary;
    
    await advanceDoc.save({ session });

    // Update driver/provider
    const model = userType === 'Provider' ? Provider : Driver;
    await model.findByIdAndUpdate(
      driverId, 
      { advance: remainingAdvance },
      { session }
    );

    await session.commitTransaction();
    return data;
  } catch (error) {
    await session.abortTransaction();
    
    // Classify the error
    if (isNetworkError(error)) {
      console.error('Network error during settlement:', error);
      throw new Error('NETWORK_ERROR: Please check your connection and try again');
    }
    
    console.error('Settlement error:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Helper function to detect network errors
function isNetworkError(error) {
  return error.message.includes('network') || 
         error.message.includes('ECONN') || 
         error.message.includes('timeout') ||
         error.name === 'MongoNetworkError';
}

// --------------------------------------------------
//Controller for get all advance
exports.getAllAdvance = async (req, res) => {
    try {
        const { driverType, driverId, search ,month, year} = req.query;

        let allAdvance
        const query = {};

        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId)
        }
 // Month and Year filter
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }
        if (search && search.trim()) {
            const searchQuery = search.trim();
            const regex = new RegExp(searchQuery, 'i');

            const searchConditions = [
                { filesNumbers: { $elemMatch: { $regex: regex } } },
            ];

            const [matchingDrivers, matchingProviders] = await Promise.all([
                Driver.find({ name: regex }).select('_id').lean(),
                Provider.find({ name: regex }).select('_id').lean(),
            ]);
            console.log('matchingDrivers, matchingProviders', matchingDrivers, matchingProviders)
            if (matchingDrivers.length > 0) {
                searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
            }
            if (matchingProviders.length > 0) {
                searchConditions.push({ driver: { $in: matchingProviders.map(p => p._id) } });
            }

            query.$or = searchConditions;
        }

        if (driverType === 'Driver') {
            allAdvance = await Advance.find({ userModel: "Driver", ...query }).sort({ createdAt: -1 }).populate('driver');
        } else {
            allAdvance = await Advance.find({ userModel: "Provider", ...query }).sort({ createdAt: -1 }).populate('driver');
        }

        if (!allAdvance) {
            return res.statu(404).json({
                message: 'Advance not found'
            })
        }

        return res.status(200).json({
            message: "All advances received successfully",
            data: allAdvance
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

exports.monthlyAdvance = asyncErrorHandler(async (req, res) => {
    const { id } = req.params
    // 1. Get the driver to access settlement dates
    const driver = await Driver.findById(id);
    if (!driver) {
        throw new NotFoundError('Driver not found');
    }

    // 2. Verify we have valid settlement dates
    if (!driver.previousSettlementCompletedDate || !driver.settlementCompletedDate) {
        throw new BadRequestError('Settlement dates are not available for this driver');
    }

    // 3. Calculate advance between these dates
    const result = await Advance.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(id),
                createdAt: {
                    $gte: driver.previousSettlementCompletedDate,
                    $lte: driver.settlementCompletedDate
                }
            }
        },
        {
            $group: {
                _id: null,
                settledAdvance: { $sum: '$addedAdvance' }
            }
        }
    ]);

    return res.status(StatusCodes.OK).json({
        success: true,
        data: {
            settledAdvanceAmount: result[0]?.settledAdvance || 0,
            periodStart: driver.previousSettlementCompletedDate,
            periodEnd: driver.settlementCompletedDate,
            details: result
        },
        message: "Advance between settlements calculated successfully"
    });
});