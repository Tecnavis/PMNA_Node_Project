const Advance = require('../Model/advance');

//Controller for creating new advance
exports.createNewAdvance = async (req, res) => {
    const { remark, advance, driverId, type } = req.body
    try {
        const newAdvance = await Advance.create({
            addedAdvance : advance,
            driver :driverId,
            remark,
            type
        });

        if (!newAdvance) {
            return res.status(400).json({
                message: 'Failed to create new advance amount',
            })
        }

        return res.status(201).json({
            message: "Advance created successfully",
        })

    } catch (error) {
        console.log(error)
    }
}
//Controller for get all advance
exports.getAllAdvance = async (req, res) => {
    try {
        const allAdvance = await Advance.find().populate('driver');

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