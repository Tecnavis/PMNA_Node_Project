const { default: mongoose } = require('mongoose');
const Advance = require('../Model/advance');
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');

//Controller for creating new advance
exports.createNewAdvance = async (req, res) => {
    const { remark, advance, driverId, type } = req.body
    try {

        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

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
        driver.advance = newAdvance;
        await driver.save();

        const newAdvanceDoc = await Advance.create({
            driver: driverId,
            addedAdvance: Number(advance),
            advance: newAdvance,
            type,
            remark,
        });

        const advanceMoreData = await settleBookingsWithAdvance(driverId, newAdvanceDoc);

        // Update advance doc with settlement data
        newAdvanceDoc.filesNumbers = advanceMoreData.filesNumbers;
        newAdvanceDoc.driverSalary = advanceMoreData.driverSalary;
        newAdvanceDoc.balanceSalary = advanceMoreData.balanceSalary;
        newAdvanceDoc.transferdSalary = advanceMoreData.transferdSalary;
        await newAdvanceDoc.save();

        res.status(200).json({ message: 'Advance saved and settlement done.', driver });

    } catch (error) {
        console.log(error)
    }
}

// helper controller for update advance amount to all driver booking salary
const settleBookingsWithAdvance = async (driverId, advanceDoc) => {

    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    const data = {
        filesNumbers: [],
        driverSalary: [],
        balanceSalary: [],
        transferdSalary: [],
    }

    const bookings = await Booking.find({
        driver: driverObjectId,
        verified: true,
    });
    if (!bookings.length || bookings.length === 0) {
        return
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
    advanceDoc.cashInHand += remainingAdvance;
    await advanceDoc.save();

    await Driver.findByIdAndUpdate(driverId, { advance: remainingAdvance });

    advanceDoc.filesNumbers = data.filesNumbers;
    advanceDoc.driverSalary = data.driverSalary;
    advanceDoc.balanceSalry = data.balanceSalry;
    advanceDoc.transferdSalary = data.transferdSalary;

    await advanceDoc.save();
    return data
};


//Controller for get all advance
exports.getAllAdvance = async (req, res) => {
    try {
        const allAdvance = await Advance.find().sort({ createdAt: -1 }).populate('driver');

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
    }
}