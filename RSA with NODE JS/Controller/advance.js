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
        const newAdvanceDoc = await Advance.create({
            driver: driverId,
            addedAdvance: Number(advance),
            advance: newAdvance,
            type,
            remark,
        });
        
        // Update driver's total advance
        driver.advance = newAdvance;
        await driver.save();
        
        await settleBookingsWithAdvance(driverId, newAdvanceDoc);

        res.status(200).json({ message: 'Advance saved and settlement done.' });

    } catch (error) {
        console.log(error)
    }
}

// helper controller for update advance amount to all driver booking salary
const settleBookingsWithAdvance = async (driverId, advanceDoc) => {
    
    const driverObjectId = new mongoose.Types.ObjectId(driverId);

    const bookings = await Booking.find({
        driver: driverObjectId,
        status: 'Order Completed',
    });
    if(!bookings.length || bookings.length === 0){
        return 
    }
    let remainingAdvance = advanceDoc.advance;

    for (const booking of bookings) {
        const currentTransferred = booking.transferedSalary || 0;
        const balanceSalary = booking.driverSalary - currentTransferred;

        if (balanceSalary <= 0) continue;

        const transferAmount = Math.min(balanceSalary, remainingAdvance);
        booking.transferedSalary = currentTransferred + transferAmount;

        await booking.save();
        remainingAdvance -= transferAmount;

        if (remainingAdvance <= 0) break;
    }

    advanceDoc.advance = remainingAdvance;
    await advanceDoc.save();

    await Driver.findByIdAndUpdate(driverId, { advance: remainingAdvance });
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