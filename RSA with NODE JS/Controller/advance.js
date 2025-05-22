const { default: mongoose } = require('mongoose');
const Advance = require('../Model/advance');
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');

const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');

//Controller for creating new advance
exports.createNewAdvance = async (req, res) => {
    const { remark, advance, driverId, type } = req.body
    try {

        if (!remark || !advance || !driverId || !type) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        let source
        let userType = "Driver"
        source = await Driver.findById(driverId);

        if (!source) {
            source = await Provider.findById(driverId);
            userType = 'Provider'
        }

        if (!source) {
            userType = ''
            return res.status(404).json({ message: 'Driver or Provider not found' });
        }

        // Fetch all advance entries for the driver
        const previousAdvances = await Advance.find({ driver: driverId });

        let existingAdvance = 0;
        for (const adv of previousAdvances) {
            existingAdvance += adv.advance;
            adv.advance = 0;
            await adv.save();
        }
        const newAdvance = existingAdvance + Number(advance);

        // Create new advance document

        // Update driver's total advance
        source.advance = newAdvance;
        await source.save();

        const newAdvanceDoc = await Advance.create({
            driver: driverId,
            addedAdvance: Number(advance),
            advance: newAdvance,
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

        res.status(200).json({ message: 'Advance saved and settlement done.', driver: source });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// helper controller for update advance amount to all driver booking salary
const settleBookingsWithAdvance = async (driverId, advanceDoc, userType) => {

    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    const data = {
        filesNumbers: [],
        driverSalary: [],
        balanceSalary: [],
        transferdSalary: [],
    }

    const bookings = await Booking.find({
        [userType === 'Driver' ? 'driver' : 'provider']: driverObjectId,
        verified: true,
    });

    if (!bookings.length || bookings.length === 0) {
        return data
    }
    let remainingAdvance = advanceDoc.advance;

    for (const booking of bookings) {

        const currentTransferred = booking.transferedSalary || 0;
        const balanceSalary = booking.driverSalary - currentTransferred;

        if (balanceSalary <= 0) continue;

        data.filesNumbers.push(booking.fileNumber)
        data.driverSalary.push(booking.driverSalary)
        data.balanceSalary.push(balanceSalary)

        const transferAmount = Math.min(balanceSalary, remainingAdvance);

        data.transferdSalary.push(transferAmount)

        booking.transferedSalary = currentTransferred + transferAmount;

        await booking.save();
        remainingAdvance -= transferAmount;
        if (remainingAdvance <= 0) break;
    }

    advanceDoc.advance = remainingAdvance;
    advanceDoc.cashInHand = (advanceDoc.cashInHand || 0) + remainingAdvance;
    await advanceDoc.save();

    if (userType === 'Provider') {
        await Provider.findByIdAndUpdate(driverId, { advance: remainingAdvance });
    } else {
        await Driver.findByIdAndUpdate(driverId, { advance: remainingAdvance });
    }

    advanceDoc.filesNumbers = data.filesNumbers;
    advanceDoc.driverSalary = data.driverSalary;
    advanceDoc.balanceSalary = data.balanceSalary;
    advanceDoc.transferdSalary = data.transferdSalary;

    await advanceDoc.save();
    return data
};


//Controller for get all advance
exports.getAllAdvance = async (req, res) => {
    try {
        const { driverType, driverId, search } = req.query;

        let allAdvance
        const query = {};

        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId)
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
    const { startDate, endingDate } = req.query;

    const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${endingDate}T23:59:59.999Z`);

    const result = await Advance.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(id),
                createdAt: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }
        },
        {
            $group: {
                _id: null,
                monthlyAdvance: { $sum: '$addedAdvance' }
            }
        },
    ]);

    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
            monthlyAdvanceAmount: result[0]?.monthlyAdvance || 0,
            monthlyAdvance: result
        },
        message: "Monthly advance retrieved successfully"
    });
})