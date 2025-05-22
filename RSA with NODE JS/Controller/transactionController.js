const SalaryTransaction = require('../Model/salaryTransaction');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');

exports.getTransactions = async (req, res) => {
    try {
        const { driverType, driverId, startDate, endDate } = req.query;

        // Build query
        const query = {};

        if (driverType) query.userModel = driverType;
        if (driverId) query.driver = driverId;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await SalaryTransaction.find(query)
            .populate({
                path: 'driver',
                select: 'name'
            })
            .sort({ createdAt: -1 });

        // Transform data to include driver names
        const transformed = transactions.map(t => ({
            ...t._doc,
            driver: {
                _id: t.driver._id,
                name: t.driver.name
            }
        }));

        res.status(200).json({
            success: true,
            data: transformed
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching transactions",
            error: error.message
        });
    }
};