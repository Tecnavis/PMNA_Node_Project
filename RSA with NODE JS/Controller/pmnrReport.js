const Booking = require("../Model/booking");

exports.pmnrReport = async (req, res) => {
    const { startDate, endDate, year } = req.query;

    try {
        const pipeline = [];

        // Base match conditions
        const matchStage = {
            $match: {
                status: 'Order Completed',
                workType: 'PaymentWork'
            }
        };

        // If date range is given
        if (startDate && endDate) {
            const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
            const endOfDay = new Date(`${endDate}T23:59:59.999Z`);
            matchStage.$match.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }
        // If only year is given
        else if (year) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                const startOfYear = new Date(Date.UTC(parsedYear, 0, 1, 0, 0, 0, 0));
                const endOfYear = new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999));
                matchStage.$match.createdAt = { $gte: startOfYear, $lte: endOfYear };
            }
        }

        pipeline.push(matchStage);

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

// New controller method for fetching monthly bookings
exports.getMonthlyBookings = async (req, res) => {
    const { month, year } = req.query;

    try {
        // Validate required parameters
        if (!month || !year) {
            return res.status(400).json({ 
                error: "Month and year parameters are required" 
            });
        }

        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (isNaN(monthNum) || isNaN(yearNum)) {
            return res.status(400).json({ 
                error: "Invalid month or year parameters" 
            });
        }

        // Calculate date range for the specific month
        const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

        // Fetch bookings with the specific criteria
        const bookings = await Booking.find({
            createdAt: { 
                $gte: startDate, 
                $lte: endDate 
            },
            status: 'Order Completed',
            workType: 'PaymentWork'
        })
        .select('fileNumber customerVehicleNumber totalAmount createdAt workType status')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            bookings: bookings,
            count: bookings.length,
            month: monthNum,
            year: yearNum,
            monthName: getMonthName(monthNum),
            totalAmount: bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
        });

    } catch (error) {
        console.error('Error fetching monthly bookings:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Helper function to get month name
function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
}