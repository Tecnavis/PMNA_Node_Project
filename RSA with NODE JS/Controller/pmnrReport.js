const Booking = require("../Model/booking");

exports.pmnrReport = async (req, res) => {
    const { startDate, endDate, year } = req.query;

    try {
        const pipeline = [];

        // If date range is given
        if (startDate && endDate) {
            const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
            const endOfDay = new Date(`${endDate}T23:59:59.999Z`);
            pipeline.push({
                $match: {
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    status: 'Order Completed',
                    workType: { $ne: 'RSAWork' }
                }
            });
        }
        // If only year is given
        else if (year) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                const startOfYear = new Date(Date.UTC(parsedYear, 0, 1, 0, 0, 0, 0));
                const endOfYear = new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999));
                pipeline.push({
                    $match: {
                        createdAt: { $gte: startOfYear, $lte: endOfYear },
                        status: 'Order Completed',
                        workType: { $ne: 'RSAWork' }
                    }
                });
            }
        }
        // No date or year filter, just base filters
        else {
            pipeline.push({
                $match: {
                    status: 'Order Completed',
                    workType: { $ne: 'RSAWork' }
                }
            });
        }

        // Project month and year
        pipeline.push({
            $project: {
                month: { $month: "$createdAt" },
                year: { $year: "$createdAt" },
                totalAmount: 1
            }
        });

        // Group by month & year
        pipeline.push({
            $group: {
                _id: { month: "$month", year: "$year" },
                totalAmount: { $sum: "$totalAmount" },
                count: { $sum: 1 }
            }
        });

        // Format response
        pipeline.push({
            $project: {
                _id: 0,
                month: "$_id.month",
                year: "$_id.year",
                totalAmount: 1,
                count: 1
            }
        });

        // Sort by year and month
        pipeline.push({
            $sort: {
                year: 1,
                month: 1
            }
        });

        const report = await Booking.aggregate(pipeline);
        res.status(200).json(report);

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message });
    }
};
